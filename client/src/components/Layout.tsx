import { NavLink, Outlet } from "react-router-dom";

interface LayoutProps {
  currentUserEmail: string;
  onLogout: () => void;
}

// The app shell: a fixed SIDEBAR on the left, a NAVBAR across the top, and the
// active page rendered in the main area via <Outlet />.
export default function Layout({ currentUserEmail, onLogout }: LayoutProps) {
  // Styles for a sidebar menu link — highlighted when its route is active.
  const menuLink = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-700 hover:text-white"
    }`;

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="w-60 bg-slate-800 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-700">
          <span className="text-white font-bold text-lg">MyApp</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/employees" className={menuLink}>
            <span>👥</span>
            <span>Employees</span>
          </NavLink>
          <NavLink to="/leaves" className={menuLink}>
            <span>📅</span>
            <span>Leaves</span>
          </NavLink>
        </nav>
      </aside>

      {/* ---------- RIGHT SIDE (navbar + content) ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* NAVBAR */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 shrink-0">
          <h2 className="font-semibold text-slate-700">Dashboard</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:inline">
              {currentUserEmail}
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg bg-slate-800 text-white text-sm font-medium px-3 py-1.5 hover:bg-slate-900 transition"
            >
              Log out
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
