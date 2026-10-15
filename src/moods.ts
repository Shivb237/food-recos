import type { StickerKind } from "./cards/design";

/** Look of each mood tile when its photo is missing, and the sticker that goes with it. */
export const MOOD_ART: Record<string, { hue: number; sticker: StickerKind }> = {
  cheap: { hue: 193, sticker: "samosa" },
  treat: { hue: 342, sticker: "sparkle" },
  punjabi: { hue: 32, sticker: "wheat" },
  biryani: { hue: 14, sticker: "handi" },
  south: { hue: 255, sticker: "dosa" },
  thali: { hue: 40, sticker: "thali" },
  homestyle: { hue: 20, sticker: "bowl" },
  clean: { hue: 146, sticker: "salad" },
  snack: { hue: 28, sticker: "chai" },
  sweets: { hue: 8, sticker: "laddoo" },
  pizza: { hue: 2, sticker: "pizza" },
};

export const SECTION_EYEBROW: Record<string, string> = {
  best: "Go-to favourites",
  new: "Fresh finds",
  premium: "Proper meals",
  mid: "Everyday good",
  healthy: "Light & clean",
  budget: "Easy on the pocket",
  special: "Worth knowing",
};
