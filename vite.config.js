import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Remove any `base:` setting
  plugins: [react()],
  build: {
    outDir: "dist", // back to default
  },
});
