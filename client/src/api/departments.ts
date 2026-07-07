// Network calls for departments (used to fill the Department dropdown).

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Department {
  _id: string;
  name: string;
}

// GET /api/departments — list all
export async function listDepartments(): Promise<Department[]> {
  const res = await fetch("/api/departments", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load departments.");
  return res.json();
}
