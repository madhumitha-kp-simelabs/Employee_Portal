import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  // Plugins add features: React JSX support + Tailwind CSS processing.
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true, // fail loudly instead of silently picking another port
    // Proxy: any request the app makes to /api/* gets forwarded to the
    // Express server on port 4100. This means our React code can just call
    // "/api/login" without worrying about the backend's address.
    proxy: {
      "/api": "http://localhost:4100",
      // Uploaded images are served by the backend; proxy them too.
      "/uploads": "http://localhost:4100",
    },
  },
});
