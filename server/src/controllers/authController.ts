import { Request, Response } from "express";
import jwt from "jsonwebtoken";

// POST /api/login
// A single, fixed login account. We check the submitted email/password against
// the ADMIN_EMAIL / ADMIN_PASSWORD values in .env — no user database needed.
export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  // 1. Basic validation.
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  // 2. Compare against the single admin credential from the environment.
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const emailOk = email.toLowerCase() === adminEmail.toLowerCase();
  const passwordOk = password === adminPassword;

  if (!emailOk || !passwordOk) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  // 3. Success! Issue a JWT the client sends back on future requests.
  const secret = process.env.JWT_SECRET ?? "dev-secret";
  const token = jwt.sign({ sub: adminEmail, email: adminEmail }, secret, {
    expiresIn: "1h",
  });

  return res.json({ token, user: { email: adminEmail } });
}
