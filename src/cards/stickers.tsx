import type { JSX } from "preact";
import type { StickerKind, StickerPlacement } from "./design";

/**
 * Flat vector "stickers", drawn on a 64 x 64 grid. Each gets a white die-cut outline from the shared
 * filter below, so mount <StickerDefs /> once near the app root.
 */

const C = {
  turmeric: "#F5B82E", chilli: "#E8423B", green: "#3FAE5B", leaf2: "#2E9650", brown: "#A9622B",
  cream: "#FFF1D6", dark: "#7A3E18", steel: "#D6DCE5", gold: "#E9A53B", flame: "#F26B1D",
};

export function StickerDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="sticker-cut" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="grown" />
          <feFlood flood-color="#ffffff" result="white" />
          <feComposite in="white" in2="grown" operator="in" result="outline" />
          <feGaussianBlur in="grown" stdDeviation="1.6" result="blur" />
          <feOffset in="blur" dy="1.6" result="shadow" />
          <feFlood flood-color="#000000" flood-opacity="0.22" />
          <feComposite in2="shadow" operator="in" result="shade" />
          <feMerge>
            <feMergeNode in="shade" />
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

const ART: Record<StickerKind, () => JSX.Element> = {
  handi: () => (
    <>
      <rect x="3" y="28" width="7" height="7" rx="3.5" fill="#8A4520" />
      <rect x="54" y="28" width="7" height="7" rx="3.5" fill="#8A4520" />
      <path d="M10 30H54C56 46 46 58 32 58C18 58 8 46 10 30Z" fill="#B5602E" />
      <path d="M11 39H53" stroke="#8A4520" stroke-width="3" />
      <path d="M15 27C17 11 47 11 49 27Z" fill={C.cream} />
      <circle cx="26" cy="20" r="2.2" fill="#F28C1B" /><circle cx="36" cy="17" r="2" fill="#F28C1B" /><circle cx="40" cy="23" r="2" fill="#F4D58A" />
      <circle cx="30" cy="24" r="1.8" fill="#F4D58A" /><circle cx="22" cy="24" r="1.6" fill="#3FAE5B" />
      <rect x="8" y="25" width="48" height="7" rx="3.5" fill="#D9823F" />
    </>
  ),
  thali: () => (
    <>
      <circle cx="32" cy="32" r="28" fill={C.steel} />
      <circle cx="32" cy="32" r="22.5" fill="#EEF2F7" />
      <circle cx="22" cy="22" r="7.5" fill="#F2C230" /><circle cx="42" cy="21" r="7" fill="#E05A2B" />
      <circle cx="44" cy="41" r="7" fill="#FFFFFF" stroke={C.steel} stroke-width="1.5" /><circle cx="22" cy="43" r="7" fill="#7CC36E" />
      <circle cx="32" cy="32" r="5.5" fill="#E9C27A" /><circle cx="32" cy="32" r="2" fill="#C99444" />
    </>
  ),
  dosa: () => (
    <>
      <g transform="rotate(-38 32 32)">
        <rect x="2" y="21" width="58" height="22" rx="11" fill={C.gold} />
        <ellipse cx="55" cy="32" rx="6" ry="11" fill="#F6D58A" />
        <path d="M14 23V41M24 22V42M34 22V42M44 23V41" stroke="#C98425" stroke-width="2.4" stroke-linecap="round" />
      </g>
      <circle cx="48" cy="50" r="10" fill="#FFFFFF" /><circle cx="48" cy="50" r="6.5" fill={C.green} /><circle cx="46" cy="48" r="2" fill="#7CC36E" />
    </>
  ),
  wheat: () => (
    <>
      <path d="M32 60V14" stroke="#B98A2B" stroke-width="3" stroke-linecap="round" />
      {[22, 33, 44].map((y) => (
        <g key={y}>
          <ellipse cx="23" cy={y} rx="5" ry="9" fill="#E9B949" transform={`rotate(-32 23 ${y})`} />
          <ellipse cx="41" cy={y} rx="5" ry="9" fill="#E9B949" transform={`rotate(32 41 ${y})`} />
        </g>
      ))}
      <ellipse cx="32" cy="11" rx="5" ry="9" fill="#F2CB62" />
    </>
  ),
  chai: () => (
    <>
      <path d="M22 17C18 12 26 11 22 5M31 17C27 12 35 11 31 5M40 17C36 12 44 11 40 5" stroke="#CDBA98" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M45 28C58 26 58 44 43 44" stroke={C.cream} stroke-width="4.5" fill="none" stroke-linecap="round" />
      <path d="M11 22H47L43 50C42 54 39 56 35 56H23C19 56 16 54 15 50Z" fill={C.cream} />
      <path d="M12.6 29H45.4L43.6 42H14.4Z" fill="#C98A4B" />
      <ellipse cx="29" cy="59" rx="23" ry="3.6" fill="#E3D6B8" />
    </>
  ),
  bowl: () => (
    <>
      <circle cx="21" cy="29" r="8.5" fill={C.turmeric} /><circle cx="34" cy="24" r="9.5" fill={C.green} /><circle cx="45" cy="29" r="7.5" fill={C.cream} />
      <circle cx="30" cy="27" r="2" fill="#7CC36E" /><circle cx="20" cy="27" r="1.8" fill="#E8A21B" />
      <path d="M7 32H57C57 47 46 58 32 58C18 58 7 47 7 32Z" fill="#E8553C" />
      <path d="M13 41H51" stroke="#FFD7C9" stroke-width="2.4" stroke-linecap="round" opacity=".7" />
    </>
  ),
  salad: () => (
    <>
      <ellipse cx="22" cy="24" rx="7" ry="12" fill={C.green} transform="rotate(-38 22 24)" />
      <ellipse cx="38" cy="22" rx="7" ry="12" fill="#6CCB6B" transform="rotate(34 38 22)" />
      <ellipse cx="31" cy="20" rx="6" ry="11" fill={C.leaf2} />
      <circle cx="44" cy="31" r="5.5" fill={C.chilli} /><circle cx="19" cy="32" r="4" fill={C.turmeric} />
      <path d="M7 33H57C57 47 46 58 32 58C18 58 7 47 7 33Z" fill="#F4F7FA" />
      <path d="M13 43H51" stroke={C.green} stroke-width="3.2" stroke-linecap="round" />
    </>
  ),
  roll: () => (
    <g transform="rotate(-35 32 32)">
      <rect x="6" y="21" width="50" height="22" rx="11" fill="#EBC98B" />
      <rect x="6" y="21" width="18" height="22" rx="9" fill="#F3F0E8" />
      <path d="M33 22V42M42 22V42" stroke="#CFA663" stroke-width="2" />
      <ellipse cx="55" cy="32" rx="6.5" ry="11" fill="#F7E3B5" />
      <circle cx="54" cy="27" r="2.6" fill="#E05A2B" /><circle cx="56" cy="34" r="2.6" fill={C.green} /><circle cx="53" cy="33" r="2" fill={C.turmeric} />
    </g>
  ),
  laddoo: () => (
    <>
      <circle cx="32" cy="29" r="19" fill="#F5A623" />
      <g fill="#C76A00"><circle cx="24" cy="24" r="1.7" /><circle cx="35" cy="20" r="1.7" /><circle cx="40" cy="31" r="1.7" /><circle cx="27" cy="35" r="1.7" /><circle cx="33" cy="29" r="1.7" /></g>
      <g fill="#7FBF5A"><rect x="29" y="14" width="4" height="2.4" rx="1.2" transform="rotate(30 31 15)" /><rect x="40" y="22" width="4" height="2.4" rx="1.2" transform="rotate(-20 42 23)" /><rect x="21" y="30" width="4" height="2.4" rx="1.2" transform="rotate(50 23 31)" /></g>
      <path d="M13 45H51L46 58H18Z" fill="#E9C46A" />
      <path d="M22 45L24 58M32 45V58M42 45L40 58" stroke="#CFA24A" stroke-width="2" />
    </>
  ),
  pizza: () => (
    <>
      <path d="M6 15C23 6 41 6 58 15L32 60Z" fill="#F7D46B" />
      <path d="M6 15C23 6 41 6 58 15L55 21C41 14 23 14 9 21Z" fill="#D9963A" />
      <circle cx="25" cy="29" r="4.6" fill="#D73A2C" /><circle cx="39" cy="31" r="4.2" fill="#D73A2C" /><circle cx="32" cy="43" r="3.8" fill="#D73A2C" />
      <path d="M31 26L34 29M36 40L39 38" stroke={C.green} stroke-width="2.4" stroke-linecap="round" />
    </>
  ),
  samosa: () => (
    <>
      <path d="M32 9L57 51H7Z" fill="#E0A03A" stroke="#E0A03A" stroke-width="7" stroke-linejoin="round" />
      <path d="M32 18L16 45M32 18L48 45" stroke="#B87820" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 5" />
      <circle cx="26" cy="38" r="1.8" fill="#B87820" /><circle cx="37" cy="40" r="1.8" fill="#B87820" /><circle cx="32" cy="30" r="1.8" fill="#B87820" />
    </>
  ),
  leaf: () => (
    <>
      <path d="M32 6C54 13 57 41 32 58C7 41 10 13 32 6Z" fill={C.green} />
      <path d="M32 14V56M32 28L21 21M32 38L43 30M32 46L22 40" stroke="#1E7A45" stroke-width="2.6" stroke-linecap="round" />
    </>
  ),
  chilli: () => (
    <>
      <path d="M10 25C26 15 54 21 56 45C57 54 46 56 43 47C40 37 28 32 10 33Z" fill={C.chilli} />
      <path d="M20 28C34 26 45 32 49 42" stroke="#FF9486" stroke-width="2.6" stroke-linecap="round" fill="none" />
      <circle cx="11" cy="29" r="7" fill={C.green} />
      <path d="M7 24C4 17 9 12 15 12" stroke={C.leaf2} stroke-width="4" stroke-linecap="round" fill="none" />
    </>
  ),
  flame: () => (
    <>
      <path d="M32 5C34 18 50 24 50 40C50 52 42 59 32 59C22 59 14 52 14 40C14 32 20 28 22 20C26 24 28 26 28 30C34 24 34 14 32 5Z" fill={C.flame} />
      <path d="M32 29C34 37 42 39 42 47C42 53 38 57 32 57C26 57 22 53 22 47C22 41 30 37 32 29Z" fill="#FFC145" />
    </>
  ),
  sparkle: () => (
    <>
      <path d="M30 3C32 21 42 30 60 32C42 34 32 43 30 61C28 43 18 34 0 32C18 30 28 21 30 3Z" fill="#FFD35A" transform="translate(2 0)" />
      <path d="M52 6C53 12 56 15 62 16C56 17 53 20 52 26C51 20 48 17 42 16C48 15 51 12 52 6Z" fill="#FFF3C4" />
    </>
  ),
};

export function Sticker({ kind, x, y, size, rot }: StickerPlacement) {
  const s = size / 64;
  const Art = ART[kind];
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) rotate(${rot} ${size / 2} ${size / 2}) scale(${s})`} filter="url(#sticker-cut)">
      <Art />
    </g>
  );
}

/** One of each, for the dev preview. */
export const ALL_STICKERS = Object.keys(ART) as StickerKind[];
