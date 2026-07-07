import rateLimit from "express-rate-limit";

// A lenient limiter for the whole API: caps how many requests one IP can make
// in a time window. Protects against abuse/scraping and accidental floods.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max requests per IP per window
  standardHeaders: true, // send RateLimit-* headers so clients can self-throttle
  legacyHeaders: false, // drop the old X-RateLimit-* headers
  message: { message: "Too many requests, please try again later." },
});

// A STRICT limiter just for login: the classic brute-force target.
// Far fewer attempts allowed, so password guessing is impractical.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // only 10 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});
