import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, "public"),
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    outDir: path.resolve(__dirname, "../dist/control-ui"),
    emptyOutDir: true,
  },
});
