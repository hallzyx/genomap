import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const entry = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: "web",
  base: "/pilot-assets/",
  publicDir: false,
  input: [
    entry("./web/index.html"),
    entry("./web/landing/index.html"),
    entry("./web/landing/en/index.html"),
  ],
  build: { outDir: "../dist", emptyOutDir: true },
});
