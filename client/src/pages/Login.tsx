import { useState, FormEvent } from "react";
import { login } from "../api/auth";

// A "prop" — the parent component passes this function in so we can tell it
// when login succeeds (e.g. to switch screens).
interface LoginProps {
  onLoggedIn: (email: string) => void;
}

export default function Login({ onLoggedIn }: LoginProps) {
  // useState creates a piece of "state": a value React watches. When it
  // changes, React re-renders the component to reflect the new value.
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Runs when the form is submitted.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      // Save the token so future requests can prove we're logged in.
      localStorage.setItem("token", data.token);
      onLoggedIn(data.user.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-5"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        {/* Show an error banner only when there is an error. */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 text-white font-medium py-2 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-xs text-center text-slate-400">
          Try <span className="font-mono">admin@example.com</span> /{" "}
          <span className="font-mono">admin123</span>
        </p>
      </form>
    </div>
  );
}
