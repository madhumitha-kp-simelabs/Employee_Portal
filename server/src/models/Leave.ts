import mongoose, { Schema, InferSchemaType } from "mongoose";

// A leave booking: one employee, one date, one half-day slot.
const leaveSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required."],
    },
    // Stored as "YYYY-MM-DD" — simple to compare and free of timezone issues.
    date: {
      type: String,
      required: [true, "Date is required."],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD."],
    },
    // Half-day slot. `enum` restricts it to exactly these two values.
    slot: {
      type: String,
      enum: {
        values: ["morning", "afternoon"],
        message: "Slot must be 'morning' or 'afternoon'.",
      },
      required: [true, "Slot is required."],
    },
    reason: { type: String, trim: true, maxlength: [200, "Reason too long."] },
    // If mirrored to Google Calendar, we store the event id here so we can
    // delete that event when the leave is cancelled.
    googleEventId: { type: String },
  },
  { timestamps: true }
);

// COMPOUND UNIQUE INDEX: the SAME employee cannot book the SAME date + slot
// twice. MongoDB enforces this — a duplicate insert throws error code 11000.
leaveSchema.index({ employee: 1, date: 1, slot: 1 }, { unique: true });

export type Leave = InferSchemaType<typeof leaveSchema>;

export const LeaveModel = mongoose.model("Leave", leaveSchema);
