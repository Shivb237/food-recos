import { describe, expect, it } from "vitest";
import raw from "../data/places.json";
import { placesFileSchema } from "../shared/schema";
import { designAll, textContrast, stickersForCuisine } from "../src/cards/design";

const { places } = placesFileSchema.parse(raw);
const designs = designAll(places);

describe("generated cards", () => {
  it("gives every place a design", () => {
    expect(designs.size).toBe(places.length);
  });

  it("is deterministic", () => {
    const again = designAll([...places].reverse());
    for (const [id, d] of designs) expect(again.get(id)).toEqual(d);
  });

  it("never repeats a full design", () => {
    const sigs = [...designs.values()].map((d) => d.signature);
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it("gives each place its own hue within its section", () => {
    const seen = new Set<string>();
    for (const p of places) {
      const key = `${p.section}:${designs.get(p.id)!.hueStep}`;
      expect(seen.has(key), `${p.id} repeats hue ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("keeps white text readable (WCAG AA) on every card", () => {
    for (const [id, d] of designs) expect(textContrast(d), id).toBeGreaterThanOrEqual(4.5);
  });

  it("picks stickers that match the food", () => {
    const by = (id: string) => stickersForCuisine(places.find((p) => p.id === id)!);
    expect(by("raju-gari-biryani")[0]).toBe("handi");
    expect(by("mojo-pizza")[0]).toBe("pizza");
    expect(by("chai-chakhna-company")[0]).toBe("chai");
    expect(by("mealful-rolls")[0]).toBe("roll");
  });
});
