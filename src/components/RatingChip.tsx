import type { Rating } from "../../shared/types";

export function RatingChip({ rating }: { rating: Rating }) {
  return (
    <span class={`rchip ${rating.value < 4 ? "mid" : ""}`} title={`${rating.source}, ${rating.count} ratings`}>
      {rating.value.toFixed(1)} ★
    </span>
  );
}
