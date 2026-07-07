import { useState, useEffect, FormEvent } from "react";
import {
  listLeaves,
  bookLeave,
  cancelLeave,
  type Leave,
  type Slot,
} from "../api/leaves";
import { listEmployees } from "../api/employees";

// Small helpers for date strings.
const pad2 = (n: number) => String(n).padStart(2, "0");
const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${pad2(m + 1)}-${pad2(d)}`; // m is 0-based

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Leaves() {
  // Which month we're viewing (0-based month).
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [error, setError] = useState("");

  // The day whose modal is open (a date string), or null.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Booking form fields.
  const [employee, setEmployee] = useState("");
  const [slot, setSlot] = useState<Slot>("morning");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // --- Month math ---
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Load leaves for the whole visible month.
  async function refresh() {
    try {
      setError("");
      const from = toDateStr(year, month, 1);
      const to = toDateStr(year, month, daysInMonth);
      setLeaves(await listLeaves(from, to));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    }
  }

  // Re-fetch whenever the month changes.
  useEffect(() => {
    refresh();
  }, [year, month]);

  // Load employees once for the dropdown.
  useEffect(() => {
    listEmployees({ limit: 100 })
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  }, []);

  // Group leaves by their date for quick lookup per day cell.
  const leavesByDate: Record<string, Leave[]> = {};
  for (const lv of leaves) {
    (leavesByDate[lv.date] ??= []).push(lv);
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function openDay(dateStr: string) {
    setSelectedDate(dateStr);
    setEmployee("");
    setSlot("morning");
    setReason("");
    setError("");
  }

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (!employee || !selectedDate) {
      setError("Please choose an employee.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await bookLeave({ employee, date: selectedDate, slot, reason });
      await refresh();
      setEmployee("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelLeave(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    }
  }

  const selectedLeaves = selectedDate ? leavesByDate[selectedDate] ?? [] : [];

  return (
    <div>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Leaves</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ‹
          </button>
          <span className="font-medium text-slate-700 w-40 text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>

      {error && !selectedDate && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-center text-xs font-medium text-slate-400 py-2"
            >
              {w}
            </div>
          ))}

          {/* Blank cells before the 1st of the month */}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {/* One cell per day */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = toDateStr(year, month, day);
            const dayLeaves = leavesByDate[dateStr] ?? [];
            return (
              <button
                key={dateStr}
                onClick={() => openDay(dateStr)}
                className="h-24 rounded-lg border border-slate-100 p-1.5 text-left hover:border-blue-400 hover:bg-blue-50/40 transition flex flex-col"
              >
                <span className="text-sm font-medium text-slate-700">{day}</span>
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayLeaves.slice(0, 2).map((lv) => (
                    <div
                      key={lv._id}
                      className={`truncate rounded px-1 text-[10px] ${
                        lv.slot === "morning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {lv.slot === "morning" ? "AM" : "PM"} {lv.employee?.name}
                    </div>
                  ))}
                  {dayLeaves.length > 2 && (
                    <div className="text-[10px] text-slate-400">
                      +{dayLeaves.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day modal: view + book + cancel */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{selectedDate}</h2>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Existing leaves for this day */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Booked</p>
              {selectedLeaves.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing booked yet.</p>
              ) : (
                selectedLeaves.map((lv) => (
                  <div
                    key={lv._id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">{lv.employee?.name}</span>{" "}
                      <span className="text-slate-500">
                        ({lv.slot === "morning" ? "Morning" : "Afternoon"})
                      </span>
                    </span>
                    <button
                      onClick={() => handleCancel(lv._id)}
                      className="text-red-600 hover:underline text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Book a new slot */}
            <form onSubmit={handleBook} className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-slate-600">Book a slot</p>
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                {(["morning", "afternoon"] as Slot[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      slot === s
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s === "morning" ? "Morning" : "Afternoon"}
                  </button>
                ))}
              </div>

              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 text-white font-medium py-2 hover:bg-blue-700 disabled:opacity-60 transition"
              >
                {saving ? "Booking..." : "Book leave"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
