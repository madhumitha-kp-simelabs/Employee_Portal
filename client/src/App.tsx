import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Employees from "./pages/Employees";
import Leaves from "./pages/Leaves";

export default function App() {
  // Track who is logged in. null = nobody is logged in yet.
  const [userEmail, setUserEmail] = useState<string | null>(null);

  function handleLogout() {
    localStorage.removeItem("token");
    setUserEmail(null);
  }

  // If nobody is logged in, show the Login page.
  if (!userEmail) {
    return <Login onLoggedIn={(email) => setUserEmail(email)} />;
  }

  // Logged in: sidebar + navbar Layout with the Employees page inside.
  return (
    <Routes>
      <Route
        element={<Layout currentUserEmail={userEmail} onLogout={handleLogout} />}
      >
        <Route path="/employees" element={<Employees />} />
        <Route path="/leaves" element={<Leaves />} />
        {/* Default: send any other URL to the employees page. */}
        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Route>
    </Routes>
  );
}
