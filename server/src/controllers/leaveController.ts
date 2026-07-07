import { Request, Response } from "express";
import mongoose from "mongoose";
import { LeaveModel } from "../models/Leave.js";
import { EmployeeModel } from "../models/Employee.js";
import {
  isGoogleConfigured,
  createLeaveEvent,
  deleteLeaveEvent,
} from "../services/googleCalendar.js";

function validationMessage(err: unknown): string | null {
  if (err instanceof mongoose.Error.ValidationError) {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
  }
  return null;
}

// POST /api/leaves   body: { employee, date, slot, reason? }
export async function bookLeave(req: Request, res: Response) {
  const { employee, date, slot, reason } = req.body ?? {};

  if (!mongoose.isValidObjectId(employee)) {
    return res.status(400).json({ message: "Invalid employee id." });
  }
  // Make sure the employee exists.
  const emp = await EmployeeModel.findById(employee);
  if (!emp) return res.status(404).json({ message: "Employee not found." });

  try {
    const leave = await LeaveModel.create({ employee, date, slot, reason });
    await leave.populate("employee", "name");

    // MIRROR to Google Calendar in the BACKGROUND (fire-and-forget). We do NOT
    // await it, so a slow/hanging Google call can't delay the booking response.
    // When it finishes we save the event id; if it fails we just log it.
    if (isGoogleConfigured()) {
      createLeaveEvent({ employeeName: emp.name, date, slot, reason })
        .then((eventId) =>
          LeaveModel.findByIdAndUpdate(leave._id, { googleEventId: eventId })
        )
        .then(() => console.log("✅ Leave mirrored to Google:", leave._id))
        .catch((gErr) =>
          console.error("Google Calendar mirror failed:", gErr.message)
        );
    }

    // Respond right away — MongoDB is the source of truth.
    return res.status(201).json(leave);
  } catch (err: any) {
    const msg = validationMessage(err);
    if (msg) return res.status(400).json({ message: msg });
    // Duplicate key = the compound unique index was violated (slot taken).
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "That slot is already booked for this employee on that date.",
      });
    }
    return res.status(500).json({ message: "Could not book leave." });
  }
}

// GET /api/leaves?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function listLeaves(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};

  // Filter by date range. Because dates are "YYYY-MM-DD" strings, normal
  // string comparison ($gte/$lte) also works as date comparison.
  const from = req.query.from?.toString();
  const to = req.query.to?.toString();
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as any).$gte = from;
    if (to) (filter.date as any).$lte = to;
  }

  const leaves = await LeaveModel.find(filter)
    .populate("employee", "name")
    .sort({ date: 1, slot: 1 });
  return res.json(leaves);
}

// DELETE /api/leaves/:id
export async function cancelLeave(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id." });
  }
  const leave = await LeaveModel.findByIdAndDelete(id);
  if (!leave) return res.status(404).json({ message: "Not found." });

  // Remove the mirrored Google event in the background (fire-and-forget).
  if (leave.googleEventId && isGoogleConfigured()) {
    deleteLeaveEvent(leave.googleEventId).catch((gErr) =>
      console.error("Google Calendar delete failed:", gErr.message)
    );
  }

  return res.json({ message: "Leave cancelled.", id });
}
