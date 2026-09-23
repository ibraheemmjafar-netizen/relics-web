import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const currentFile = fileURLToPath(import.meta.url);
const root = path.dirname(currentFile);

export default defineConfig({
  base: process.env.BASE_PATH || "/",

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(root, "src")
    },
    dedupe: ["react", "react-dom"]
  },

  root,

  build: {
    outDir: path.resolve(root, "dist"),
    emptyOutDir: true
  }
});