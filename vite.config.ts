import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: { jsx: "automatic" },
  build: {
    target: "es2022",
    outDir: "member-dist",
    copyPublicDir: false,
    rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: "app.js" } },
  },
});
