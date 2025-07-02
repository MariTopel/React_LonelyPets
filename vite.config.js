import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

//base: "./" makes all <script> and <link> tags use relative paths
// "outDir": docs tells vite to drop the production build into docs/
export default defineConfig({
  base: "./", // so assets load correctly on GitHub Pages
  plugins: [react()],
  build: {
    outDir: "docs", // output to docs/ so Pages can serve it
  },
});
