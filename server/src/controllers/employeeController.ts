import { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { once } from "node:events";
import mongoose from "mongoose";
import { EmployeeModel } from "../models/Employee.js";

// Escape regex special characters in user input, so a search like "a.b" is
// treated as literal text — not a regex pattern (prevents ReDoS / weird matches).
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Escape a value for CSV: wrap in quotes if it contains a comma, quote, or
// newline, and double any inner quotes. Prevents one field breaking the columns.
function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Turn a Mongoose ValidationError into one readable message, or null if the
// error is something else. Lets us reply 400 with a clear reason.
function validationMessage(err: unknown): string | null {
  if (err instanceof mongoose.Error.ValidationError) {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
  }
  return null;
}

// CREATE — POST /api/employees   (multipart/form-data: name, position, age, photo)
// The upload middleware runs first and puts the file on req.file.
export async function createEmployee(req: Request, res: Response) {
  const { name, position, age, department } = req.body ?? {};
  const photo = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const employee = await EmployeeModel.create({
      name,
      position,
      age: age ? Number(age) : undefined, // form values arrive as strings
      photo,
      // Store the department id only if a valid one was sent.
      department:
        department && mongoose.isValidObjectId(department)
          ? department
          : undefined,
    });
    return res.status(201).json(employee);
  } catch (err) {
    // If the schema rules were broken, reply 400 with the reason.
    const msg = validationMessage(err);
    if (msg) return res.status(400).json({ message: msg });
    return res.status(500).json({ message: "Could not create employee." });
  }
}

// READ (list) — GET /api/employees?page=1&limit=5&search=&position=&sort=-createdAt
export async function listEmployees(req: Request, res: Response) {
  // --- Pagination (as before) ---
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  // --- FILTER: build a MongoDB filter object from the query params ---
  const filter: Record<string, unknown> = {};

  // SEARCH: partial, case-insensitive match on the name.
  const search = (req.query.search ?? "").toString().trim();
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: "i" };
  }

  // FILTER by exact position.
  const position = (req.query.position ?? "").toString().trim();
  if (position) {
    filter.position = position;
  }

  // --- SORT: e.g. "name" (asc) or "-age" (desc). Default newest first. ---
  const sortParam = (req.query.sort ?? "-createdAt").toString();
  const sort: Record<string, 1 | -1> = {};
  if (sortParam.startsWith("-")) {
    sort[sortParam.slice(1)] = -1; // leading "-" means descending
  } else {
    sort[sortParam] = 1; // otherwise ascending
  }

  // Run the page query and the count IN PARALLEL — both use the SAME filter,
  // so totalPages reflects the filtered result set, not the whole collection.
  const [employees, total] = await Promise.all([
    // .populate("department", "name") replaces each employee's department id
    // with the actual Department document (only its `name` field here) — the JOIN.
    EmployeeModel.find(filter)
      .populate("department", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    EmployeeModel.countDocuments(filter),
  ]);

  return res.json({
    data: employees,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

// EXPORT (streamed CSV) — GET /api/employees/export
// Streams employees to the response ONE ROW AT A TIME, so memory stays flat
// even with millions of records (we never build the whole file in memory).
export async function exportEmployeesCsv(_req: Request, res: Response) {
  // Tell the browser this is a downloadable CSV file.
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');

  // Write the header row immediately (res is itself a writable STREAM).
  res.write("Name,Position,Age,Created At\n");

  // .cursor() gives a READABLE STREAM over the query — it fetches documents in
  // batches from MongoDB instead of loading them all at once.
  const cursor = EmployeeModel.find().sort({ createdAt: -1 }).cursor();

  try {
    // Pull one employee at a time (async iteration over the cursor stream).
    for await (const emp of cursor) {
      const row =
        [
          csvEscape(emp.name),
          csvEscape(emp.position),
          csvEscape(emp.age),
          csvEscape(emp.createdAt?.toISOString()),
        ].join(",") + "\n";

      // res.write returns false when its internal BUFFER is full (the client is
      // reading slower than we're writing) — this is BACKPRESSURE. We pause
      // until the "drain" event says the buffer has emptied, then continue.
      if (!res.write(row)) {
        await once(res, "drain");
      }
    }
    res.end(); // no more data → finish the response
  } catch (err) {
    // If something breaks mid-stream, abort the connection. We can't change the
    // status code here because headers were already sent when we started writing.
    res.destroy(err as Error);
  }
}

// UPDATE — PUT /api/employees/:id  (multipart/form-data: name, position, age, photo?)
// The photo is optional on edit: only replaced if the user picks a new file.
export async function updateEmployee(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  const { name, position, age, department } = req.body ?? {};

  // Build an object with only the fields we want to change.
  const updates: Record<string, unknown> = { name, position };
  if (age) updates.age = Number(age);

  // Update the department link if a valid id was sent.
  if (department && mongoose.isValidObjectId(department)) {
    updates.department = department;
  }

  // If a new photo was uploaded, point to it (and remember the old one to delete).
  if (req.file) {
    updates.photo = `/uploads/${req.file.filename}`;
  }

  try {
    // { new: true } returns the document AFTER the update, not before.
    // runValidators: true makes the schema rules apply on updates too.
    const employee = await EmployeeModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!employee) return res.status(404).json({ message: "Not found." });
    return res.json(employee);
  } catch (err) {
    const msg = validationMessage(err);
    if (msg) return res.status(400).json({ message: msg });
    return res.status(500).json({ message: "Could not update employee." });
  }
}

// DELETE — DELETE /api/employees/:id
export async function deleteEmployee(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  const employee = await EmployeeModel.findByIdAndDelete(id);
  if (!employee) return res.status(404).json({ message: "Not found." });

  // Remove the photo file from disk too.
  if (employee.photo) {
    const filePath = path.join(process.cwd(), employee.photo);
    fs.rm(filePath, { force: true }, () => {});
  }

  return res.json({ message: "Deleted.", id });
}
