# Design system (as built in artifact v7, plus required changes)

## Direction

Warm, minimal, food-first, app-like. Light: clean white. Dark: warm charcoal (not navy, which he disliked). One saffron accent. Each section has a soft food-inspired tint. Generous white space; one primary action per screen.

## Tokens (current)

Light: `--bg #FFFFFF`, `--surface #FFFFFF`, `--soft #F6F3EF`, `--fg #1F1A17`, `--muted #6E655E`, `--faint #A1978F`, `--line #ECE6E0`, `--accent #F2631C`, `--accent-ink #B4430A`, `--accent-soft #FFEDE2`.
Dark: `--bg #151110`, `--surface #1F1A17`, `--soft #29221E`, `--fg #F5EFE9`, `--accent #FF7A33`.

Section colour / tint (light): Best `#C06400 / #FFF0DC` (turmeric), Premium `#A8274F / #FCE7EC` (beetroot), Healthy `#1E7A45 / #E5F4E9` (mint), Budget `#13708A / #E3F1F6` (lassi blue), Special `#8A5526 / #F8ECDF` (jaggery), New `#5D3FC4 / #EEE9FB` (brinjal).

Type: **Bricolage Grotesque** 700/800 for display, **Figtree** 400–700 for body (Google Fonts).

Veg marks: the Indian food-pack squares (green square + dot = veg, brown square + triangle = non-veg). "Veg & non-veg" shows both side by side.

## Components that worked (keep)

- **Hero:** rounded panel with three blurred colour blobs drifting slowly, greeting by time of day, "What should you order today?" with the accent on the second half. **He loves this.**
- **Bottom sheet** for details: drag handle, swipe down to close, big Swiggy (#FC8019) and Zomato (#CB202D) buttons, map link.
- **Swipeable rows** per section with "See all", scroll-snap, arrow buttons on mouse devices.
- **"Can't decide?"** card: shuffles names, lands with confetti.
- Likes (heart, double-tap with heart burst), comment thread, "Most loved", "What people are saying".
- Confetti and particles via one small canvas engine; all motion off under `prefers-reduced-motion`.

## Must change

- **Every card needs a real photo** (Places API). Suggested card: 4:3 photo with rounded corners, veg chip top-left, rating chip top-right, like count bottom-right, photographer credit bottom-left; name and cuisine · price below. Shimmer skeleton while loading.
- **Mood panel:** replace cartoon icons with photo tiles (taller cards with a dark gradient and a bold label, like Swiggy's "What's on your mind"). Heading idea: "What are you craving?"
- **Section hierarchy:** match the hero below it: eyebrow, large display heading, short subline, pill "See all", consistent spacing. Consider gradient-tinted section headers drawn from each section's colour.
- **Details sheet:** swipeable 4-photo gallery with attribution.
- Remove the Pure veg switch. Fix veg labels (see CLAUDE.md).
- No cartoon illustrations anywhere a real photo can go.
