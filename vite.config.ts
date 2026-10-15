import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import type { Plugin } from "vite";
import { apiDevPlugin } from "./server/devPlugin.ts";

/**
 * Link-preview images need a full web address. On Vercel it comes from the deploy itself (or SITE_URL if you set one);
 * locally there is none, so the tag falls back to a relative path.
 */
function siteUrl(): Plugin {
  const host = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return { name: "site-url", transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", host.replace(/\/$/, "")) };
}

export default defineConfig({
  plugins: [preact(), siteUrl(), apiDevPlugin()],
  server: {
    // The picker rewrites these files; without this Vite would reload the page (and lose loaded photos) on every save.
    watch: { ignored: ["**/data/place-ids.json", "**/data/photo-picks.json", "**/data/place-id-overrides.json", "**/data/place-id-review.json"] },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
