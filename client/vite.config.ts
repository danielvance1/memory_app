import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the page is served by Vite on :5173, but the API runs on
    // :3000. This forwards any /api/... request so the browser sees one origin.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
