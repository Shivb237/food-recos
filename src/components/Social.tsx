import { useEffect, useRef, useState } from "preact/hooks";
import type { Place } from "../../shared/types";
import { IconComment, IconHeart } from "./Icons";
import { burstAt } from "../lib/fx";
import {
  ago, deleteComment, fetchComments, isAdmin, postComment, saveName, savedName, setLike, useSocial, type PlaceComment, type RecentComment,
} from "../lib/social";
import { placeById } from "../data";

/** Little "♥ 3" chip on a card's picture. Shows nothing until someone has hearted the place. */
export function HeartChip({ slug }: { slug: string }) {
  const s = useSocial();
  const n = s.likes[slug] ?? 0;
  if (s.status !== "ready" || n < 1) return null;
  const mine = s.mine.includes(slug);
  return <span class={`heart-chip ${mine ? "mine" : ""}`} title={`${n} ${n === 1 ? "like" : "likes"}`}><IconHeart filled />{n}</span>;
}

/** Heart + comment buttons and the "N likes" line in the details sheet. */
export function SocialBar({ place }: { place: Place }) {
  const s = useSocial();
  if (s.status !== "ready") return null;
  const liked = s.mine.includes(place.id);
  const n = s.likes[place.id] ?? 0;
  const cc = s.commentCounts[place.id] ?? 0;
  return (
    <>
      <div class="socialbar">
        <button
          class={`ib like ${liked ? "on" : ""}`}
          type="button"
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          onClick={(e) => {
            if (!liked) burstAt(e.currentTarget, { n: 16, hearts: true, spread: 0.9, up: 0.9 });
            void setLike(place.id, !liked);
          }}
        >
          <IconHeart filled={liked} />
        </button>
        <button class="ib" type="button" aria-label={`Comments${cc ? ` (${cc})` : ""}`} onClick={() => document.getElementById("comments")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
          <IconComment />
        </button>
      </div>
      <p class="likedby">
        {n ? <b>{n} {n === 1 ? "like" : "likes"}</b> : <span>Be the first to like this</span>}
        {n > 0 && liked && <span> · including you</span>}
      </p>
    </>
  );
}

function CommentRow({ c, onDelete }: { c: PlaceComment; onDelete: () => void }) {
  const [sure, setSure] = useState(false);
  const canDelete = c.mine || isAdmin();
  return (
    <li class="cm">
      <span class="av" aria-hidden="true">{(c.name[0] ?? "?").toUpperCase()}</span>
      <div class="cb">
        <div class="ch"><b>{c.mine ? "You" : c.name}</b>{c.mine && c.name && <span>({c.name})</span>}<span>{ago(c.t)}</span></div>
        <p>{c.text}</p>
        {canDelete && (
          <button class={`del ${sure ? "sure" : ""}`} type="button" onClick={() => (sure ? onDelete() : (setSure(true), setTimeout(() => setSure(false), 3000)))}>
            {sure ? "Tap again to delete" : "Delete"}
          </button>
        )}
      </div>
    </li>
  );
}

export function Comments({ place }: { place: Place }) {
  const s = useSocial();
  const [list, setList] = useState<PlaceComment[] | null>(null);
  const [name, setName] = useState(savedName());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setList(null);
    fetchComments(place.id).then((c) => live && setList(c));
    return () => { live = false; };
  }, [place.id, s.commentCounts[place.id]]);

  if (s.status !== "ready") return null;

  const submit = async () => {
    const t = text.trim();
    const n = name.trim();
    if (!t || !n || busy) return;
    setBusy(true);
    const c = await postComment(place.id, n, t);
    setBusy(false);
    if (c) {
      saveName(n);
      setText("");
      setList((l) => [c, ...(l ?? [])]);
      burstAt(box.current, { n: 30, spread: 0.9 });
    }
  };

  return (
    <section class="cmts" id="comments">
      <h3>Comments{list && list.length > 0 && <span>{list.length}</span>}</h3>
      <form class="composer" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {!savedName() && (
          <input class="who" value={name} maxLength={40} placeholder="Your name (shown with your comment)" aria-label="Your name" autocomplete="nickname" onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        )}
        <div class="row">
          <input ref={box} value={text} maxLength={280} placeholder="Tell people what to order here…" aria-label="Add a comment" autocomplete="off" onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)} />
          <button type="submit" class="post" disabled={busy || !text.trim() || !name.trim()}>Post</button>
        </div>
      </form>
      {list === null ? (
        <p class="nocm">Loading…</p>
      ) : list.length === 0 ? (
        <p class="nocm">No comments yet. Be the first.</p>
      ) : (
        <ul class="clist">
          {list.map((c) => (
            <CommentRow key={c.id} c={c} onDelete={async () => { if (await deleteComment(place.id, c.id)) setList((l) => (l ?? []).filter((x) => x.id !== c.id)); }} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** "What people are saying": the latest comments across all places. */
export function SayingFeed({ items, onOpen }: { items: RecentComment[]; onOpen: (p: Place) => void }) {
  const shown = items.filter((c) => placeById.has(c.place)).slice(0, 4);
  if (!shown.length) return null;
  return (
    <section class="block" aria-labelledby="saying-h">
      <header class="phead"><div><h2 id="saying-h">What people are saying</h2></div></header>
      <div class="feed">
        {shown.map((c) => (
          <button key={c.id} class="fi" type="button" onClick={() => onOpen(placeById.get(c.place)!)}>
            <span class="av" aria-hidden="true">{(c.name[0] ?? "?").toUpperCase()}</span>
            <span class="cb">
              <span class="ch"><b>{c.mine ? "You" : c.name}</b><span>{ago(c.t)}</span></span>
              <span class="on">on <b>{placeById.get(c.place)!.name}</b></span>
              <p>{c.text}</p>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
