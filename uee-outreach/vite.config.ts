import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `--mode single` inlines everything into one HTML file for the shareable demo.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
  build: { outDir: mode === "single" ? "dist-single" : "dist" },
  test: { environment: "node" },
}));
