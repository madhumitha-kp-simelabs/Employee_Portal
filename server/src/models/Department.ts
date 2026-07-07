import mongoose, { Schema, InferSchemaType } from "mongoose";

// A department, e.g. "Engineering", "HR". Employees will REFERENCE one of these.
const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      unique: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [50, "Name must be at most 50 characters."],
    },
  },
  { timestamps: true }
);

export type Department = InferSchemaType<typeof departmentSchema>;

export const DepartmentModel = mongoose.model("Department", departmentSchema);
