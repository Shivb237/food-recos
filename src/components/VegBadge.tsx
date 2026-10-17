import type { VegKind } from "../../shared/types";

const VEG_LABEL: Record<VegKind, string> = {
  pure: "Pure veg",
  both: "Veg & non-veg",
  options: "Veg options",
};

/** The Indian food-pack squares: green dot = veg, brown triangle = non-veg. */
function VegMark({ kind }: { kind: "veg" | "nonveg" }) {
  return <i class={`vmark ${kind}`} aria-hidden="true" />;
}

/**
 * pure    -> green mark + "Pure veg"
 * both    -> green and brown marks together + "Veg & non-veg" (never a lone brown mark)
 * options -> neutral leaf + "Veg options" (unconfirmed, so no mark that could be misread)
 */
export function VegBadge({ veg, compact = false }: { veg: VegKind; compact?: boolean }) {
  return (
    <span class={`vbadge ${veg}`} title={VEG_LABEL[veg]}>
      {veg === "pure" && <VegMark kind="veg" />}
      {veg === "both" && (<><VegMark kind="veg" /><VegMark kind="nonveg" /></>)}
      {veg === "options" && (
        <svg class="vleaf" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C4 9 10 4 20 4c0 10-5 16-13 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /><path d="M5 19c3-5 6-8 10-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
      )}
      <span class={compact ? "vtext sr-only" : "vtext"}>{VEG_LABEL[veg]}</span>
    </span>
  );
}
