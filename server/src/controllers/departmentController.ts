import { Request, Response } from "express";
import mongoose from "mongoose";
import { DepartmentModel } from "../models/Department.js";

function validationMessage(err: unknown): string | null {
  if (err instanceof mongoose.Error.ValidationError) {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
  }
  return null;
}

// CREATE — POST /api/departments   body: { name }
export async function createDepartment(req: Request, res: Response) {
  const { name } = req.body ?? {};
  try {
    const department = await DepartmentModel.create({ name });
    return res.status(201).json(department);
  } catch (err: any) {
    const msg = validationMessage(err);
    if (msg) return res.status(400).json({ message: msg });
    if (err?.code === 11000) {
      return res.status(409).json({ message: "That department already exists." });
    }
    return res.status(500).json({ message: "Could not create department." });
  }
}

// READ (list) — GET /api/departments
export async function listDepartments(_req: Request, res: Response) {
  const departments = await DepartmentModel.find().sort({ name: 1 });
  return res.json(departments);
}

// DELETE — DELETE /api/departments/:id
export async function deleteDepartment(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id." });
  }
  const department = await DepartmentModel.findByIdAndDelete(id);
  if (!department) return res.status(404).json({ message: "Not found." });
  return res.json({ message: "Deleted.", id });
}
