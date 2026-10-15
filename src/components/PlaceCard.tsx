import type { Place } from "../../shared/types";
import { IconBookmark } from "./Icons";
import { PlaceMedia } from "./PlaceMedia";
import { photoExpected } from "../lib/coverage";
import { useSaved } from "../lib/storage";
import { HeartChip } from "./Social";

const TIER = ["", "₹", "₹₹", "₹₹₹"];

/**
 * One place, as a card. Generated art already prints the name, cuisine and price tier,
 * so under it we show the price in words; under a photo we show the name and cuisine.
 */
export function PlaceCard({ place, onOpen }: { place: Place; onOpen: (p: Place) => void }) {
  const saved = useSaved().includes(place.id);
  const photo = photoExpected(place);
  const meta = photo
    ? [place.cuisine, place.priceTier ? TIER[place.priceTier] : null].filter(Boolean).join(" · ")
    : place.price;
  return (
    <button class="card" type="button" onClick={() => onOpen(place)}>
      <PlaceMedia
        place={place}
        corner={<><HeartChip slug={place.id} />{saved ? <span class="saved-dot" title="Saved"><IconBookmark filled /></span> : null}</>}
      />
      <span class="card-body">
        {photo && <span class="card-name">{place.name}</span>}
        {meta && <span class="card-meta">{meta}</span>}
        {place.flag && <span class="gtk">Good to know</span>}
      </span>
    </button>
  );
}
