import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// The "bouncer": runs before a protected route. If the request has a valid JWT,
// it lets it through; otherwise it replies 401 and the controller never runs.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 1. Read the token from the "Authorization: Bearer <token>" header.
  //    "Bearer eyJhbGci...".split(" ") → ["Bearer", "eyJhbGci..."], we want [1].
  const token = req.headers.authorization?.split(" ")[1];

  // 2. No token at all → reject.
  if (!token) {
    return res.status(401).json({ message: "Not logged in." });
  }

  // 3. Verify the t
  // oken was signed by us and hasn't expired.
  try {
    const secret = process.env.JWT_SECRET ?? "dev-secret";
    const payload = jwt.verify(token, secret);
    // Remember who the user is, in case a controller wants it later.
    (req as any).user = payload;
    next(); // ✅ valid → continue to the controller
  } catch {
    // 4. Token is fake, tampered, or expired → reject.
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
