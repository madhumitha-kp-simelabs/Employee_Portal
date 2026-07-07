// Network calls for the Positions feature.

// Auth header built from the token saved at login (routes are protected).
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Position {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
}

// GET /api/positions — list all
export async function listPositions(): Promise<Position[]> {
  const res = await fetch("/api/positions", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load positions.");
  return res.json();
}

// POST /api/positions — create (JSON body, not a file, so we set Content-Type)
export async function createPosition(
  name: string,
  description: string
): Promise<Position> {
  const res = await fetch("/api/positions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, description }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to save.");
  return data;
}

// DELETE /api/positions/:id
export async function deletePosition(id: string): Promise<void> {
  const res = await fetch(`/api/positions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete.");
}
