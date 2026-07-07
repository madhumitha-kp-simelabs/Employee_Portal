// Network calls for the Employees feature.

// Builds the auth header from the token we saved at login. Every protected
// request must include this so the backend's requireAuth lets it through.
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Employee {
  _id: string;
  name: string;
  position?: string;
  age?: number;
  photo?: string; // e.g. "/uploads/123-pic.jpg"
  // After .populate(), department is the full object (or null if none set).
  department?: { _id: string; name: string } | null;
  createdAt: string;
}

// The shape the paginated endpoint returns.
export interface EmployeePage {
  data: Employee[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Options for the list query.
export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  position?: string;
  sort?: string; // e.g. "name" or "-age"
}

// GET /api/employees?page=&limit=&search=&position=&sort= — one filtered page.
export async function listEmployees(
  params: EmployeeQuery = {}
): Promise<EmployeePage> {
  const { page = 1, limit = 5, search = "", position = "", sort = "-createdAt" } =
    params;

  // URLSearchParams builds a properly-encoded query string and skips empties.
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  if (search) qs.set("search", search);
  if (position) qs.set("position", position);
  if (sort) qs.set("sort", sort);

  const res = await fetch(`/api/employees?${qs.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load employees.");
  return res.json();
}

// POST /api/employees — create (sends a file, so uses FormData not JSON)
export async function createEmployee(formData: FormData): Promise<Employee> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: authHeaders(), // only the auth header — NOT Content-Type (FormData sets that)
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to save.");
  return data;
}

// PUT /api/employees/:id — update (also FormData; photo is optional on edit)
export async function updateEmployee(
  id: string,
  formData: FormData
): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to update.");
  return data;
}

// GET /api/employees/export — download the CSV.
// Because the route is protected, we can't use a plain <a href> (it wouldn't
// send the token). Instead we fetch WITH the auth header, get the file as a
// Blob, then trigger a download via a temporary link.
export async function exportEmployeesCsv(): Promise<void> {
  const res = await fetch("/api/employees/export", { headers: authHeaders() });
  if (!res.ok) throw new Error("Export failed.");

  const blob = await res.blob(); // the CSV file contents
  const url = URL.createObjectURL(blob); // a temporary in-browser URL for it
  const a = document.createElement("a");
  a.href = url;
  a.download = "employees.csv"; // the filename the browser saves as
  a.click(); // programmatically click it → triggers the download
  URL.revokeObjectURL(url); // free the temporary URL
}

// DELETE /api/employees/:id
export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete.");
}
