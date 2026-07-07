import "dotenv/config"; // loads variables from .env into process.env
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./routes/auth.js";
import employeesRouter from "./routes/employees.js";
import positionsRouter from "./routes/positions.js";
import departmentsRouter from "./routes/departments.js";
import leavesRouter from "./routes/leaves.js";
import { uploadsDir } from "./middleware/upload.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { connectDB } from "./db/connect.js";

const app = express();

// If deployed behind a proxy/load balancer, trust it so req.ip is the REAL
// client IP (from X-Forwarded-For) — important for correct rate limiting.
app.set("trust proxy", 1);

// --- Middleware: code that runs on every request before it hits a route ---

// Set secure HTTP headers (X-Frame-Options, no X-Powered-By, HSTS, etc.).
// crossOriginResourcePolicy is relaxed so uploaded images can load in the browser.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Allow the React dev server (a different origin/port) to call this API.
app.use(cors({ origin: "http://localhost:5180" }));

// Parse incoming JSON request bodies into req.body.
app.use(express.json());

// Rate-limit every /api request per IP (protects against abuse/floods).
app.use("/api", apiLimiter);

// --- Routes ---

// A quick health check so you can confirm the server is alive in a browser.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Login (single admin account).
app.use("/api", authRouter);

// Employee CRUD endpoints.
app.use("/api/employees", employeesRouter);

// Position endpoints.
app.use("/api/positions", positionsRouter);

// Department endpoints.
app.use("/api/departments", departmentsRouter);

// Leave booking endpoints (backed by Google Calendar).
app.use("/api/leaves", leavesRouter);

// Serve uploaded images: a request to /uploads/foo.jpg returns the file on disk.
app.use("/uploads", express.static(uploadsDir));

// --- Start the server ---
// Connect to MongoDB first, then start listening.
const PORT = Number(process.env.PORT) || 4100;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ API server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });


