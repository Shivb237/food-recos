import { hash32, rng } from "../../shared/hash";
import { hslToRgb, mix, contrast, type RGB } from "../../shared/color";
import type { Place, SectionId } from "../../shared/types";

/**
 * Generated cards for places without a photo.
 * Everything here is pure and deterministic: the same place list always gives the same cards,
 * and no two places in a section share a hue + pattern.
 */

const STICKER_KINDS = [
  "handi", "thali", "dosa", "wheat", "chai", "bowl", "salad", "roll", "laddoo",
  "pizza", "samosa", "leaf", "chilli", "flame", "sparkle",
] as const;
export type StickerKind = (typeof STICKER_KINDS)[number];

const PATTERN_KINDS = ["dots", "stripes", "rings", "waves", "gingham", "scallops", "rays", "arches"] as const;
type PatternKind = (typeof PATTERN_KINDS)[number];

const LAYOUT_KINDS = [
  "bottom-left", "bottom-right", "top-left", "top-right", "bottom-center", "center",
] as const;
type LayoutKind = (typeof LAYOUT_KINDS)[number];

export interface StickerPlacement {
  kind: StickerKind;
  /** Centre in the 120 x 90 art space. */
  x: number;
  y: number;
  /** Width in art-space units. */
  size: number;
  rot: number;
}

export interface CardDesign {
  id: string;
  hueStep: number;
  c1: string;
  c2: string;
  angle: number;
  pattern: PatternKind;
  /** Where non-tiling patterns (rings, rays, arches) are anchored, in art space. */
  anchor: { x: number; y: number };
  patternScale: number;
  layout: LayoutKind;
  /** Which edge the darkening scrim sits on, behind the text. */
  scrim: "top" | "bottom";
  stickers: StickerPlacement[];
  /** Colour behind the text, after the scrim, at its lightest. Used to guarantee contrast. */
  textZone: RGB[];
  signature: string;
}

export const ART_W = 120;
export const ART_H = 90;
const HUE_STEPS = 16;

// Section base colours follow the design tokens (turmeric, beetroot, mint, lassi, jaggery, brinjal).
const BASE: Record<SectionId, { hue: number; sat: number }> = {
  best: { hue: 32, sat: 82 },
  premium: { hue: 342, sat: 66 },
  mid: { hue: 290, sat: 50 },
  healthy: { hue: 146, sat: 58 },
  budget: { hue: 193, sat: 72 },
  special: { hue: 14, sat: 58 },
  new: { hue: 255, sat: 56 },
};

const KEYWORDS: [RegExp, StickerKind][] = [
  [/biryani/, "handi"],
  [/chai/, "chai"],
  [/dosa|idli|tiffin|millet|south/, "dosa"],
  [/pizza/, "pizza"],
  [/roll|wrap|burrito/, "roll"],
  [/sweet|pootharekulu|mithai/, "laddoo"],
  [/salad|keto|low-carb|protein|healthy/, "salad"],
  [/khichdi|bowl|box8/, "bowl"],
  [/thali|meals|home-style|satvik|bihari/, "thali"],
  [/kulcha|paratha|roti|punjabi|dhaba|north indian|amritsari/, "wheat"],
  [/snack|chaat|samosa/, "samosa"],
];

/** Stickers that tell you what kind of food it is, most relevant first. */
export function stickersForCuisine(place: Place): StickerKind[] {
  const text = `${place.cuisine ?? ""} ${place.name}`.toLowerCase();
  const found: StickerKind[] = [];
  for (const [re, kind] of KEYWORDS) if (re.test(text) && !found.includes(kind)) found.push(kind);
  for (const m of place.moods) {
    const k: StickerKind | undefined = (
      { biryani: "handi", south: "dosa", thali: "thali", sweets: "laddoo", snack: "samosa", pizza: "pizza", punjabi: "wheat", clean: "salad" } as Record<string, StickerKind>
    )[m];
    if (k && !found.includes(k)) found.push(k);
  }
  if (!found.length) found.push("bowl");
  return found;
}

// Slots per layout: the first slot is the big sticker, the rest are small. Text sits opposite.
const SLOTS: Record<LayoutKind, [number, number, number][]> = {
  "bottom-left": [[90, 33, 38], [64, 19, 18], [108, 66, 18]],
  "bottom-right": [[30, 34, 38], [76, 17, 18], [12, 66, 18]],
  "top-left": [[90, 65, 40], [56, 76, 20], [108, 24, 20]],
  "top-right": [[30, 65, 40], [64, 76, 20], [12, 24, 20]],
  "bottom-center": [[60, 24, 38], [17, 20, 20], [103, 22, 20]],
  center: [[20, 22, 32], [100, 68, 30], [104, 20, 18]],
};
const SCRIM: Record<LayoutKind, "top" | "bottom"> = {
  "bottom-left": "bottom", "bottom-right": "bottom", "bottom-center": "bottom",
  "top-left": "top", "top-right": "top", center: "bottom",
};

const GENERIC: StickerKind[] = ["sparkle", "flame", "leaf", "chilli", "sparkle"];

function build(place: Place, hueStep: number, pattern: PatternKind): CardDesign {
  const r = rng(hash32(place.id));
  const base = BASE[place.section];
  const hue = (base.hue + (hueStep - (HUE_STEPS - 1) / 2) * 3.4 + 360) % 360;
  const sat = base.sat + Math.round(r() * 14);
  const l1 = 31 + Math.round(r() * 4);
  const l2 = 41 + Math.round(r() * 4);
  const shift = 12 + Math.round(r() * 30);
  const layout = LAYOUT_KINDS[hash32(place.id + ":layout") % LAYOUT_KINDS.length]!;
  const slots = SLOTS[layout];

  const wanted = stickersForCuisine(place);
  const kinds: StickerKind[] = [wanted[0]!];
  if (wanted[1]) kinds.push(wanted[1]);
  if (place.veg === "pure" && !kinds.includes("leaf")) kinds.push("leaf");
  for (const g of GENERIC) if (kinds.length < 3 && !kinds.includes(g)) kinds.push(g);
  if (kinds.length < 3) kinds.push("sparkle");

  const stickers = kinds.slice(0, 3).map((kind, i): StickerPlacement => {
    const [sx, sy, sz] = slots[i]!;
    return { kind, x: sx + (r() - 0.5) * 6, y: sy + (r() - 0.5) * 6, size: sz * (0.92 + r() * 0.16), rot: Math.round((r() - 0.5) * 50) };
  });

  const c1 = hslToRgb(hue, sat, l1);
  const c2 = hslToRgb((hue + shift) % 360, sat, l2);
  const black: RGB = [0, 0, 0];
  const scrimAlpha = 0.42;
  const css = ([a, b, c]: RGB) => `rgb(${a} ${b} ${c})`;

  const d: CardDesign = {
    id: place.id,
    hueStep,
    c1: css(c1),
    c2: css(c2),
    angle: 120 + Math.round(r() * 110),
    pattern,
    anchor: { x: r() < 0.5 ? 6 + r() * 30 : 84 + r() * 30, y: r() < 0.5 ? 8 + r() * 26 : 56 + r() * 30 },
    patternScale: 0.85 + r() * 0.5,
    layout,
    scrim: SCRIM[layout],
    stickers,
    textZone: [mix(black, c1, scrimAlpha), mix(black, c2, scrimAlpha)],
    signature: "",
  };
  d.signature = [place.section, hueStep, pattern, layout, ...stickers.map((s) => s.kind)].join("|");
  return d;
}

/**
 * Designs for every place at once, so collisions can be resolved: within a section, each place gets
 * its own hue step (and if a section ever outgrows 16 places, (hue step, pattern) is never repeated).
 */
export function designAll(places: Place[]): Map<string, CardDesign> {
  const hueTaken = new Set<string>();
  const pairTaken = new Set<string>();
  const out = new Map<string, CardDesign>();
  for (const place of [...places].sort((a, b) => a.id.localeCompare(b.id))) {
    let step = hash32(place.id + ":hue") % HUE_STEPS;
    let pat = hash32(place.id + ":pattern") % PATTERN_KINDS.length;
    let tries = 0;
    while (hueTaken.has(`${place.section}:${step}`) && tries < HUE_STEPS) {
      step = (step + 1) % HUE_STEPS;
      tries++;
    }
    if (tries === HUE_STEPS) {
      // A section with more than 16 places: hues must repeat, so keep (hue, pattern) unique instead.
      while (pairTaken.has(`${place.section}:${step}:${pat}`)) pat = (pat + 1) % PATTERN_KINDS.length;
    }
    hueTaken.add(`${place.section}:${step}`);
    pairTaken.add(`${place.section}:${step}:${pat}`);
    out.set(place.id, build(place, step, PATTERN_KINDS[pat]!));
  }
  return out;
}

export function textContrast(d: CardDesign): number {
  return Math.min(...d.textZone.map((c) => contrast([255, 255, 255], c)));
}
