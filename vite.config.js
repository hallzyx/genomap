import { defineConfig } from "vite";

// One single-page app: the server returns dist/index.html for every screen.
export default defineConfig({
  root: "web",
  base: "/pilot-assets/",
  publicDir: false,
  build: { outDir: "../dist", emptyOutDir: true },
});
