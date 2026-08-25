import { defineConfig } from "vite";

// GitHub Pages serves a project site (not a custom domain or a
// username.github.io root page) from https://<user>.github.io/<repo>/, so
// every asset URL needs that "/rmgr-viewer/" prefix - but only there. Local
// dev and `vite preview` should keep serving from "/". `CI` is set by
// GitHub Actions automatically, so this doesn't need its own env var.
const base = process.env.CI ? "/rmgr-viewer/" : "/";

export default defineConfig({
  base,
  server: {
    port: 5183,
  },
});
