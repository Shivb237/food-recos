import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error plain JS build script
import { bundleApi } from "../scripts/build-api.mjs";

describe("api bundles (what Vercel runs)", () => {
  it("are up to date with server/ (run `npm run build:api` if this fails)", async () => {
    const out = (await bundleApi({ write: false })) as { path: string; text: string }[];
    expect(out.length).toBeGreaterThanOrEqual(2);
    for (const f of out) {
      const name = f.path.split("/").pop()!;
      expect(readFileSync(`api/${name}`, "utf8"), name).toBe(f.text);
    }
  });

  it("have no relative imports left, which strict Node ESM on Vercel would fail to resolve", () => {
    for (const name of ["photo", "social"]) {
      const text = readFileSync(`api/${name}.js`, "utf8");
      expect(text, name).not.toMatch(/\bfrom\s+["']\.{1,2}\//);
      expect(text, name).toMatch(/export\s*\{[^}]*default/);
    }
  });
});
