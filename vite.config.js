import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  base: "/pilot-assets/",
  publicDir: false,
  build: { outDir: "../dist", emptyOutDir: true },
});
