import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "apps/web",
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { charts: ["recharts"] } } },
  },
  server: { middlewareMode: true },
});
