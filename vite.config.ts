import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Served from the root of a custom domain (replay.12cb.dev) via GitHub
// Pages, not the default username.github.io/rmgr-viewer/ subpath - so this
// is always "/", not conditional on CI the way it used to be.
const base = "/";

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
