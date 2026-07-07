import mongoose from "mongoose";

// Opens a connection to MongoDB. We call this once when the server starts.
// Mongoose keeps the connection alive and reuses it for every query.
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Check your server/.env file.");
  }

  // mongoose.connect returns a promise that resolves once connected.
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");
}
