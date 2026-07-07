import { google, calendar_v3 } from "googleapis";
import fs from "node:fs";
import path from "node:path";

const SLOT_TIMES = {
  morning: { start: "09:00:00", end: "13:00:00", label: "Morning" },
  afternoon: { start: "14:00:00", end: "18:00:00", label: "Afternoon" },
} as const;

export type Slot = keyof typeof SLOT_TIMES;

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "";
const KEY_FILE = process.env.GOOGLE_KEY_FILE ?? "";
const TIMEZONE = process.env.LEAVE_TIMEZONE ?? "Asia/Kolkata";

// Absolute path to the service-account JSON key.
const keyFilePath = KEY_FILE ? path.resolve(KEY_FILE) : "";

// True only when the key file exists and a calendar id is set. The leave flow
// checks this before mirroring, so the app runs fine WITHOUT any Google setup.
export function isGoogleConfigured(): boolean {
  return Boolean(CALENDAR_ID && keyFilePath && fs.existsSync(keyFilePath));
}

let cachedClient: calendar_v3.Calendar | null = null;

function getCalendar(): calendar_v3.Calendar {
  if (cachedClient) return cachedClient;
  // Read the service-account key from the JSON file. JSON.parse turns the \n in
  // the private key into real newlines. We use a JWT client (explicit service-
  // account auth) so the access token is attached to every request.
  const creds = JSON.parse(fs.readFileSync(keyFilePath, "utf8"));
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  cachedClient = google.calendar({ version: "v3", auth });
  return cachedClient;
}

// Reject a promise if it doesn't settle within `ms`, so a hanging Google call
// can never block us forever.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Create a Google Calendar event for a leave; returns the new event's id.
export async function createLeaveEvent(params: {
  employeeName: string;
  date: string;
  slot: Slot;
  reason?: string;
}): Promise<string> {
  const calendar = getCalendar();
  const t = SLOT_TIMES[params.slot];
  const resp = await withTimeout(
    calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `${params.employeeName} — ${t.label} Leave`,
        description: params.reason || undefined,
        start: { dateTime: `${params.date}T${t.start}`, timeZone: TIMEZONE },
        end: { dateTime: `${params.date}T${t.end}`, timeZone: TIMEZONE },
      },
    }),
    15000,
    "Google events.insert"
  );
  return resp.data.id ?? "";
}

// Delete the mirrored event.
export async function deleteLeaveEvent(eventId: string): Promise<void> {
  const calendar = getCalendar();
  await withTimeout(
    calendar.events.delete({ calendarId: CALENDAR_ID, eventId }),
    15000,
    "Google events.delete"
  );
}
