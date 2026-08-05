import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackStartVite } from "@tanstack/start/vite";
import tailwindcss from "tailwindcss";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    TanStackStartVite({
      server: {
        entry: "server",
        importProtection: {},
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    middlewareMode: false,
  },
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
});
