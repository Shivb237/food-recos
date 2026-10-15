import { useMemo, useState } from "preact/hooks";
import { places, sections } from "../data";
import { designs } from "../cards/designs";
import { textContrast } from "../cards/design";
import { StickerDefs, Sticker, ALL_STICKERS } from "../cards/stickers";
import { PlaceMedia } from "../components/PlaceMedia";
import "./preview.css";

const WIDTHS = [
  { id: 160, label: "Row (160)" },
  { id: 220, label: "Card (220)" },
  { id: 340, label: "Large (340)" },
  { id: 520, label: "Sheet (520)" },
];

/** Dev-only gallery: every place as a generated card, at the sizes the app will use. */
export function CardsPreview() {
  const [width, setWidth] = useState(220);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [group, setGroup] = useState(true);
  const [showStickers, setShowStickers] = useState(false);

  const stats = useMemo(() => {
    const sigs = new Set([...designs.values()].map((d) => d.signature));
    const hues = new Set([...designs.values()].map((d) => `${places.find((p) => p.id === d.id)!.section}:${d.hueStep}`));
    const worst = Math.min(...[...designs.values()].map(textContrast));
    return { unique: sigs.size, total: designs.size, hues: hues.size, worst };
  }, []);

  const lists = group ? sections.map((s) => ({ title: s.title, items: places.filter((p) => p.section === s.id) })) : [{ title: "All places", items: places }];

  return (
    <div class="pv" data-theme={theme}>
      <StickerDefs />
      <header class="pv-head">
        <h1>Generated cards <small>/dev/cards</small></h1>
        <p>
          What a place shows when it has no photo. One shared pattern, a different look for every place.
          {" "}<b>{stats.unique}/{stats.total}</b> unique designs · <b>{stats.hues}</b> distinct section+hue slots · worst text contrast <b>{stats.worst.toFixed(1)}:1</b>
        </p>
        <div class="pv-controls">
          <div class="seg" role="group" aria-label="Card size">
            {WIDTHS.map((w) => <button key={w.id} aria-pressed={width === w.id} onClick={() => setWidth(w.id)}>{w.label}</button>)}
          </div>
          <div class="seg" role="group" aria-label="Theme">
            {(["light", "dark"] as const).map((t) => <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t}</button>)}
          </div>
          <button class="tog" aria-pressed={group} onClick={() => setGroup(!group)}>Group by section</button>
          <button class="tog" aria-pressed={showStickers} onClick={() => setShowStickers(!showStickers)}>Sticker sheet</button>
        </div>
      </header>

      {showStickers && (
        <section class="pv-section">
          <h2>Sticker sheet</h2>
          <div class="pv-stickers">
            {ALL_STICKERS.map((k) => (
              <figure key={k}>
                <svg viewBox="0 0 80 80" width="96" height="96"><rect width="80" height="80" rx="12" fill="#c8561b" /><Sticker kind={k} x={40} y={40} size={56} rot={0} /></svg>
                <figcaption>{k}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {lists.map((l) => (
        <section class="pv-section" key={l.title}>
          <h2>{l.title} <small>{l.items.length}</small></h2>
          <div class="pv-grid" style={{ "--w": `${width}px` } as Record<string, string>}>
            {l.items.map((p) => (
              <figure key={p.id}>
                <PlaceMedia place={{ ...p, photo: null }} />
                <figcaption>{p.id}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
