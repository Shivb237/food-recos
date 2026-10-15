import { describe, expect, it } from "vitest";
import raw from "../data/places.json";
import { BAND_TIER, bandFor } from "../shared/price";
import { placesFileSchema } from "../shared/schema";
import { buildIndex, searchPlaces } from "../src/lib/search";
import { designAll } from "../src/cards/design";

const file = placesFileSchema.parse(raw);
const byId = (id: string) => file.places.find((p) => p.id === id)!;

describe("price bands", () => {
  it("cuts at ₹200 and ₹350", () => {
    expect(bandFor(199)).toBe("budget");
    expect(bandFor(200)).toBe("mid");
    expect(bandFor(349)).toBe("mid");
    expect(bandFor(350)).toBe("premium");
    expect(bandFor(null)).toBeNull();
    expect(bandFor(0)).toBeNull();
  });

  it("every place's band, tier and section agree with its meal price", () => {
    for (const p of file.places) {
      expect(p.priceBand, p.id).toBe(bandFor(p.mealPrice));
      expect(p.priceTier, p.id).toBe(p.priceBand ? BAND_TIER[p.priceBand] : null);
      if (["budget", "mid", "premium"].includes(p.section)) expect(p.section, p.id).toBe(p.priceBand);
    }
  });

  it("puts ITC in Premium and no longer calls it mid-range", () => {
    const itc = byId("itc-aashirvaad-soul-creations");
    expect(itc.priceBand).toBe("premium");
    expect(itc.section).toBe("premium");
    expect(itc.flag ?? "").not.toMatch(/mid-range/i);
  });

  it("is honest about where each price came from", () => {
    for (const p of file.places.filter((x) => x.mealPrice !== null)) {
      expect(p.priceSource, p.id).toBeTruthy();
      expect(["menu", "estimate"]).toContain(p.priceConfidence);
    }
  });

  it("finds places by price words", () => {
    const index = buildIndex(file.places, file.moods, file.sections);
    const ids = (q: string) => searchPlaces(index, q).map((p) => p.id);
    expect(ids("premium")).toContain("salt");
    expect(ids("budget")).toContain("jdm-punjabi-dhaba");
    expect(ids("mid-range")).toContain("harvest-salad-co");
  });

  it("generated cards stay unique with the new Mid-range section", () => {
    const sigs = [...designAll(file.places).values()].map((d) => d.signature);
    expect(new Set(sigs).size).toBe(sigs.length);
  });
});
