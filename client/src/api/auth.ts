// This file is the ONLY place that knows how to talk to the login API.
// Keeping network code out of components makes the UI easier to read and test.

// The shape of a successful login response from our Express server.
export interface LoginResponse {
  token: string;
  user: { id: number; email: string };
}

// Calls POST /api/login. Returns the data on success, or throws an Error
// whose message is safe to show the user.
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  // fetch only rejects on network failure, so we check the status ourselves.
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "Login failed. Please try again.");
  }

  return data as LoginResponse;
}
