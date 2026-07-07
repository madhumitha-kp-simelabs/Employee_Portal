import mongoose, { Schema, InferSchemaType } from "mongoose";

// An employee record: name, position, age, and an uploaded photo (path).
const employeeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [50, "Name must be at most 50 characters."],
    },
    position: {
      type: String,
      trim: true,
      maxlength: [50, "Position must be at most 50 characters."],
    },
    age: {
      type: Number,
      min: [18, "Age must be at least 18."],
      max: [100, "Age must be at most 100."],
    },
    photo: { type: String }, // stores the path, e.g. "/uploads/123-pic.jpg"
    // A REFERENCE to a Department document. We store only its ObjectId (a link),
    // NOT a copy of the department. `ref` tells .populate() which model to load.
    department: { type: Schema.Types.ObjectId, ref: "Department" },
  },
  { timestamps: true }
);

export type Employee = InferSchemaType<typeof employeeSchema>;

// Creates the "employees" collection in MongoDB.
export const EmployeeModel = mongoose.model("Employee", employeeSchema);
