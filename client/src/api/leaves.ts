// Network calls for leave booking.

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type Slot = "morning" | "afternoon";

export interface Leave {
  _id: string;
  employee: { _id: string; name: string };
  date: string; // "YYYY-MM-DD"
  slot: Slot;
  reason?: string;
}

// GET /api/leaves?from=&to=
export async function listLeaves(from: string, to: string): Promise<Leave[]> {
  const res = await fetch(`/api/leaves?from=${from}&to=${to}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load leaves.");
  return res.json();
}

// POST /api/leaves
export async function bookLeave(input: {
  employee: string;
  date: string;
  slot: Slot;
  reason?: string;
}): Promise<Leave> {
  const res = await fetch("/api/leaves", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to book leave.");
  return data;
}

// DELETE /api/leaves/:id
export async function cancelLeave(id: string): Promise<void> {
  const res = await fetch(`/api/leaves/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to cancel leave.");
}
