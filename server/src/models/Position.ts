import mongoose, { Schema, InferSchemaType } from "mongoose";

// A job position, e.g. "Software Engineer", "Manager".
const positionSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      unique: true, // no two positions with the same name
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [50, "Name must be at most 50 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description must be at most 200 characters."],
    },
  },
  { timestamps: true }
);

export type Position = InferSchemaType<typeof positionSchema>;

export const PositionModel = mongoose.model("Position", positionSchema);
