import { useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Place } from "../../shared/types";
import { GeneratedCard } from "../cards/GeneratedCard";
import { designs } from "../cards/designs";
import { usePlacePhotos, useNearViewport, type PlacePhoto } from "../lib/photos";
import { RatingChip } from "./RatingChip";
import { VegBadge } from "./VegBadge";
import "./components.css";

interface Props {
  place: Place;
  /** 16:10 instead of 4:3, for the details sheet. */
  wide?: boolean;
  /** Generated art without its text, when the name is printed next to it (details sheet). */
  artOnly?: boolean;
  /** Load up to 4 photos as a swipeable gallery (details sheet) instead of one. */
  gallery?: boolean;
  /** Anything to float bottom-right (saved mark, likes). */
  corner?: ComponentChildren;
}

function Credit({ photo, link }: { photo: PlacePhoto; link: boolean }) {
  if (!photo.author) return null;
  return (
    <span class="credit">
      Photo: {link && photo.authorUri ? <a href={photo.authorUri} target="_blank" rel="noopener">{photo.author}</a> : photo.author}
    </span>
  );
}

function Slides({ photos, placeName }: { photos: PlacePhoto[]; placeName: string }) {
  const [index, setIndex] = useState(0);
  return (
    <>
      <div
        class="slides"
        onScroll={(e) => {
          const el = e.currentTarget as HTMLElement;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {photos.map((p, i) => (
          <figure class="slide" key={p.uri}>
            <img src={p.uri} alt={`${placeName} photo ${i + 1}`} decoding="async" loading={i === 0 ? "eager" : "lazy"} referrerpolicy="no-referrer" />
            <Credit photo={p} link />
          </figure>
        ))}
      </div>
      {photos.length > 1 && (
        <div class="dots" aria-hidden="true">{photos.map((p, i) => <i key={p.uri} class={i === index ? "on" : ""} />)}</div>
      )}
    </>
  );
}

/**
 * The picture frame for a place, with the veg badge and rating chip over it.
 * Photo (Shivang's, then Google's) when there is one, a tinted skeleton while it loads, otherwise the generated card.
 */
export function PlaceMedia({ place, wide = false, artOnly = false, gallery = false, corner }: Props) {
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const { state: photos, refresh } = usePlacePhotos(place, gallery ? 4 : 1, gallery ? 960 : 480, near);
  const [failed, setFailed] = useState<string | null>(null);
  const refreshed = useRef(false);
  /** An image link that stopped working: ask once for a fresh one, otherwise fall back to the generated card. */
  const broken = (uri: string) => (refreshed.current ? setFailed(uri) : ((refreshed.current = true), refresh()));
  const showPhotos = photos.status === "ready" && failed !== photos.photos[0]?.uri;

  return (
    <div ref={ref} class={`media ${wide ? "wide" : ""}`} style={{ "--tint": `var(--s-${place.section})` } as Record<string, string>}>
      <div class="art">
        {showPhotos && photos.status === "ready" ? (
          gallery ? (
            <Slides photos={photos.photos} placeName={place.name} />
          ) : (
            <>
              <img class="photo" src={photos.photos[0]!.uri} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onError={() => broken(photos.photos[0]!.uri)} />
              <Credit photo={photos.photos[0]!} link={false} />
            </>
          )
        ) : photos.status === "loading" ? (
          <div class="skeleton" aria-hidden="true" />
        ) : (
          <GeneratedCard place={place} design={designs.get(place.id)!} artOnly={artOnly} />
        )}
      </div>
      <div class="chip-tl"><VegBadge veg={place.veg} /></div>
      {place.rating && <div class="chip-tr"><RatingChip rating={place.rating} /></div>}
      {corner && <div class="chip-br">{corner}</div>}
    </div>
  );
}
