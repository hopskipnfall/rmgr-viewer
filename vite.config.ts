import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.CI ? "/rmgr-viewer/" : "/";

export default defineConfig({
  base,
  resolve: {
    alias: {
      "@rmg-k/rmgr": path.resolve(__dirname, "../rmgr-ts/src/index.ts"),
    },
  },
  server: {
    port: 5183,
    fs: {
      allow: [".."],
    },
  },
});
