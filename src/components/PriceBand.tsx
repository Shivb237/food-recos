import { BAND_LABEL, BAND_TIER } from "../../shared/price";
import type { Place } from "../../shared/types";

/** "Mid-range · ₹₹": how expensive ordering from this place is, from its delivery menu. Nothing if we have no price. */
export function PriceBand({ place }: { place: Place }) {
  if (!place.priceBand) return null;
  const tier = BAND_TIER[place.priceBand];
  return (
    <span class={`pband ${place.priceBand}`} title={place.priceConfidence === "estimate" ? "Estimated price band" : "From the delivery menu"}>
      {BAND_LABEL[place.priceBand]}
      <span class="rup" aria-hidden="true">{"₹".repeat(tier)}</span>
    </span>
  );
}

/** "Veg meal about ₹260", with a tilde when the figure is an estimate. */
export const mealText = (p: Place) => (p.mealPrice ? `Veg meal ${p.priceConfidence === "estimate" ? "~" : "≈ "}₹${p.mealPrice}` : null);
