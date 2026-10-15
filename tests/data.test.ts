import { describe, expect, it } from "vitest";
import raw from "../data/places.json";
import { crossCheck, placesFileSchema } from "../shared/schema";
import { slugify } from "../shared/slug";

const file = placesFileSchema.parse(raw);

describe("places.json", () => {
  it("passes cross-field checks", () => {
    expect(crossCheck(file).errors).toEqual([]);
  });

  it("has every place in exactly one known section, with known moods", () => {
    const sections = new Set(file.sections.map((s) => s.id));
    const moods = new Set(file.moods.map((m) => m.id));
    for (const p of file.places) {
      expect(sections.has(p.section)).toBe(true);
      for (const m of p.moods) expect(moods.has(m), `${p.id} mood ${m}`).toBe(true);
    }
  });

  it("keeps the veg labels the owner asked for", () => {
    const kinds = new Set(file.places.map((p) => p.veg));
    expect([...kinds].sort()).toEqual(["both", "options", "pure"]);
    expect(file.places.find((p) => p.id === "salt")?.veg).toBe("options");
  });

  it("flags Norfest as closed and keeps its warning", () => {
    const n = file.places.find((p) => p.id === "norfest-the-dhaba")!;
    expect(n.closed).toBe(true);
    expect(n.flag).toMatch(/permanently closed/);
  });

  it("derives slugs from searchName", () => {
    for (const p of file.places) expect(p.id).toBe(slugify(p.searchName));
    expect(slugify("Haldiram's")).toBe("haldirams");
  });
});

describe("order links in places.json", () => {
  it("stores Zomato links only as Hyderabad restaurant pages on zomato.com", () => {
    for (const p of file.places) if (p.zomatoUrl) expect(p.zomatoUrl, p.id).toMatch(/^https:\/\/www\.zomato\.com\/hyderabad\/[a-z0-9-]+$/);
  });
});

describe("swiggy links in places.json", () => {
  it("stores Swiggy links only as swiggy.com pages", () => {
    for (const p of file.places) if (p.swiggyUrl) expect(p.swiggyUrl, p.id).toMatch(/^https:\/\/www\.swiggy\.com\/(restaurants|city\/hyderabad)\/[A-Za-z0-9\-_/]+$/);
  });
});
