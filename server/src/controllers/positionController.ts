import { Request, Response } from "express";
import mongoose from "mongoose";
import { PositionModel } from "../models/Position.js";

// Turn a Mongoose ValidationError into one readable message, or null.
function validationMessage(err: unknown): string | null {
  if (err instanceof mongoose.Error.ValidationError) {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
  }
  return null;
}

// CREATE — POST /api/positions   body: { name, description }
export async function createPosition(req: Request, res: Response) {
  const { name, description } = req.body ?? {};
  try {
    const position = await PositionModel.create({ name, description });
    return res.status(201).json(position);
  } catch (err: any) {
    const msg = validationMessage(err);
    if (msg) return res.status(400).json({ message: msg });
    // 11000 = duplicate key (the unique name already exists).
    if (err?.code === 11000) {
      return res.status(409).json({ message: "That position already exists." });
    }
    return res.status(500).json({ message: "Could not create position." });
  }
}

// READ (list) — GET /api/positions
export async function listPositions(_req: Request, res: Response) {
  const positions = await PositionModel.find().sort({ createdAt: -1 });
  return res.json(positions);
}

// DELETE — DELETE /api/positions/:id
export async function deletePosition(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id." });
  }
  const position = await PositionModel.findByIdAndDelete(id);
  if (!position) return res.status(404).json({ message: "Not found." });
  return res.json({ message: "Deleted.", id });
}
