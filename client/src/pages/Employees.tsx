import { useState, useEffect, FormEvent } from "react";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  exportEmployeesCsv,
  type Employee,
} from "../api/employees";
import { listPositions, type Position } from "../api/positions";
import { listDepartments, type Department } from "../api/departments";

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // The list of positions, loaded once, used to fill the Position dropdown.
  const [positions, setPositions] = useState<Position[]>([]);
  // The list of departments, for the Department dropdown.
  const [departments, setDepartments] = useState<Department[]>([]);

  // Pagination state.
  const LIMIT = 5; // how many employees per page
  const [page, setPage] = useState(1); // which page we're viewing
  const [totalPages, setTotalPages] = useState(1); // how many pages exist

  // Search / filter / sort state.
  const [searchInput, setSearchInput] = useState(""); // what the user types (instant)
  const [search, setSearch] = useState(""); // debounced value actually sent to the API
  const [positionFilter, setPositionFilter] = useState(""); // "" = all positions
  const [sort, setSort] = useState("-createdAt"); // default newest first

  // DEBOUNCE: wait 400ms after the user stops typing before searching, so we
  // don't fire a request on every single keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // a new search should start from page 1
    }, 400);
    return () => clearTimeout(timer); // cancel if they type again before 400ms
  }, [searchInput]);

  // Controls whether the form modal is open.
  const [showForm, setShowForm] = useState(false);
  // null = we're ADDING; an id = we're EDITING that employee.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields.
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [age, setAge] = useState("");
  const [department, setDepartment] = useState(""); // holds the selected dept id
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Per-field error messages, e.g. { name: "Name is required.", age: "..." }.
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    position?: string;
    age?: string;
  }>({});

  // Check the form values against the SAME rules the backend enforces.
  // Returns an errors object; empty object = everything is valid.
  function validate() {
    const errors: { name?: string; position?: string; age?: string } = {};

    const trimmedName = name.trim();
    if (!trimmedName) errors.name = "Name is required.";
    else if (trimmedName.length < 2)
      errors.name = "Name must be at least 2 characters.";
    else if (trimmedName.length > 50)
      errors.name = "Name must be at most 50 characters.";

    if (position.trim().length > 50)
      errors.position = "Position must be at most 50 characters.";

    // Age is optional, but if given it must be a number in range.
    if (age.trim()) {
      const n = Number(age);
      if (Number.isNaN(n)) errors.age = "Age must be a number.";
      else if (n < 18) errors.age = "Age must be at least 18.";
      else if (n > 100) errors.age = "Age must be at most 100.";
    }

    return errors;
  }

  async function refresh() {
    try {
      setError("");
      // Send the current page + search/filter/sort to the API.
      const res = await listEmployees({
        page,
        limit: LIMIT,
        search,
        position: positionFilter,
        sort,
      });
      setEmployees(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch whenever page, search, filter, or sort changes.
  useEffect(() => {
    refresh();
  }, [page, search, positionFilter, sort]);

  // Load positions and departments ONCE, to fill the dropdowns.
  useEffect(() => {
    listPositions()
      .then(setPositions)
      .catch(() => {});
    listDepartments()
      .then(setDepartments)
      .catch(() => {});
  }, []);

  // Open the modal in ADD mode: empty form.
  function openForm() {
    setEditingId(null);
    setName("");
    setPosition("");
    setAge("");
    setDepartment("");
    setFile(null);
    setPreview(null);
    setError("");
    setFieldErrors({});
    setShowForm(true);
  }

  // Open the modal in EDIT mode: pre-fill with this employee's data.
  function openEdit(emp: Employee) {
    setEditingId(emp._id);
    setName(emp.name);
    setPosition(emp.position ?? "");
    setAge(emp.age != null ? String(emp.age) : ""); // number → string for the input
    setDepartment(emp.department?._id ?? ""); // the populated object's id
    setFile(null); // no new file chosen yet
    setPreview(emp.photo ?? null); // show the existing photo
    setError("");
    setFieldErrors({});
    setShowForm(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate first. If there are errors, show them and STOP (no request).
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("position", position);
      formData.append("age", age);
      formData.append("department", department); // the selected department id
      if (file) formData.append("photo", file); // only send a photo if one was picked

      if (editingId) {
        // EDIT: update this employee, then stay on the current page.
        await updateEmployee(editingId, formData);
        setShowForm(false);
        await refresh();
      } else {
        // ADD: create, then jump to page 1 to see the newest.
        await createEmployee(formData);
        setShowForm(false);
        if (page === 1) await refresh();
        else setPage(1); // changing page triggers the useEffect refetch
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Delete ${emp.name}?`)) return;
    try {
      await deleteEmployee(emp._id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div>
      {/* Header + actions */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
        <div className="flex gap-2">
          <button
            onClick={() =>
              exportEmployeesCsv().catch(() => setError("Export failed."))
            }
            className="rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 transition"
          >
            Export CSV
          </button>
          <button
            onClick={openForm}
            className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition"
          >
            + Add Employee
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {/* Search / filter / sort toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* SEARCH by name */}
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* FILTER by position */}
        <select
          value={positionFilter}
          onChange={(e) => {
            setPositionFilter(e.target.value);
            setPage(1); // filtering should reset to page 1
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p._id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        {/* SORT */}
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
          <option value="name">Name (A→Z)</option>
          <option value="-name">Name (Z→A)</option>
          <option value="age">Age (low→high)</option>
          <option value="-age">Age (high→low)</option>
        </select>
      </div>

      {/* Employees table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              <th className="px-6 py-3 font-medium">Photo</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Position</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Age</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                  No employees yet. Click "Add Employee".
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    {emp.photo ? (
                      <img
                        src={emp.photo}
                        alt={emp.name}
                        className="h-12 w-12 object-cover rounded-full border border-slate-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                        none
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-800 font-medium">{emp.name}</td>
                  <td className="px-6 py-3 text-slate-500">{emp.position || "—"}</td>
                  {/* department is the POPULATED object → read its .name */}
                  <td className="px-6 py-3 text-slate-500">
                    {emp.department?.name || "—"}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{emp.age ?? "—"}</td>
                  <td className="px-6 py-3 text-right space-x-3">
                    <button
                      onClick={() => openEdit(emp)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(emp)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination controls ---------- */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-slate-500">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* ---------- Add Employee modal ---------- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Edit Employee" : "Add Employee"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.name ? "border-red-400" : "border-slate-300"
                }`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.position ? "border-red-400" : "border-slate-300"
                }`}
              >
                <option value="">Select a position</option>
                {positions.map((p) => (
                  <option key={p._id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              {fieldErrors.position && (
                <p className="text-xs text-red-600">{fieldErrors.position}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.age ? "border-red-400" : "border-slate-300"
                }`}
              />
              {fieldErrors.age && (
                <p className="text-xs text-red-600">{fieldErrors.age}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Photo{" "}
                {editingId && (
                  <span className="text-slate-400 font-normal">
                    (leave blank to keep current)
                  </span>
                )}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {preview && (
              <img
                src={preview}
                alt="preview"
                className="h-24 w-24 object-cover rounded-lg border border-slate-200"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 text-slate-700 font-medium px-4 py-2 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 text-white font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-60 transition"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
