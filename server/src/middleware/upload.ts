import multer from "multer";
import path from "node:path";
import fs from "node:fs";

// --- File upload middleware (Multer) ---
// Kept separate because it's reusable middleware, not business logic.

// Where uploaded files are saved on disk. Created if it doesn't exist.
export const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// diskStorage tells Multer WHERE to put files and WHAT to name them.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    // Prefix with a timestamp so two files with the same name don't collide.
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

// The configured middleware. Use as `upload.single("photo")` in a route.
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  },
});
