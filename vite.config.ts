import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
      target: "vercel",
    }),
    viteReact(),
  ],
  server: {
    port: 8080,
  },
  ssr: {
    // Bundle all dependencies into the server output so the Vercel
    // serverless function is self-contained (no node_modules at runtime).
    // Only for the production build — in dev it breaks SSR of CJS deps (React).
    noExternal: command === "build" ? true : undefined,
  },
}));
