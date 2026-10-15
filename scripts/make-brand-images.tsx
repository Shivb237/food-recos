/**
 * Draws the brand pictures from the same stickers the app uses, by rendering small HTML pages and
 * screenshotting them with Chrome (headless). Needs Google Chrome installed (set CHROME to its path if it isn't the Mac default).
 *
 *   npm run brand:images
 *
 * Writes into public/: og.png (WhatsApp/link preview, 1200x630), icon-512.png, icon-192.png, apple-touch-icon.png, favicon.svg
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderToString } from "preact-render-to-string";
import { Sticker, StickerDefs } from "../src/cards/stickers";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const root = resolve(import.meta.dirname, "..");
const fonts = `${root}/node_modules/@fontsource-variable`;
const work = join(tmpdir(), "manikonda-brand");
mkdirSync(work, { recursive: true });

const fontCss = `
@font-face{font-family:"Bricolage";src:url("file://${fonts}/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2");font-weight:200 800}
@font-face{font-family:"Figtree";src:url("file://${fonts}/figtree/files/figtree-latin-wght-normal.woff2");font-weight:300 900}`;

const stickersSvg = (w: number, h: number, items: Parameters<typeof Sticker>[0][]) =>
  renderToString(
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg">
      <StickerDefs />
      {items.map((s, i) => <Sticker key={i} {...s} />)}
    </svg>,
  ).replace(/<svg width="0" height="0"[\s\S]*?<\/svg>/, ""); // drop the nested zero-size defs svg; the filter is re-added below

const FILTER = `<svg width="0" height="0" style="position:absolute"><defs><filter id="sticker-cut" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="grown"/><feFlood flood-color="#ffffff" result="white"/><feComposite in="white" in2="grown" operator="in" result="outline"/><feGaussianBlur in="grown" stdDeviation="1.6" result="blur"/><feOffset in="blur" dy="1.6" result="shadow"/><feFlood flood-color="#000000" flood-opacity="0.22"/><feComposite in2="shadow" operator="in" result="shade"/><feMerge><feMergeNode in="shade"/><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`;

function shot(name: string, html: string, w: number, h: number, out: string) {
  const file = join(work, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", "--force-device-scale-factor=1", `--window-size=${w},${h}`, "--virtual-time-budget=4000", `--screenshot=${out}`, `file://${file}`], { stdio: "ignore" });
  console.log("wrote", out.replace(root + "/", ""));
}

// ---- WhatsApp / link preview card ----
const ogStickers = stickersSvg(520, 520, [
  { kind: "handi", x: 270, y: 250, size: 330, rot: -6 },
  { kind: "dosa", x: 90, y: 110, size: 150, rot: -14 },
  { kind: "chai", x: 440, y: 120, size: 150, rot: 10 },
  { kind: "chilli", x: 440, y: 430, size: 120, rot: 24 },
  { kind: "sparkle", x: 70, y: 400, size: 90, rot: 0 },
  { kind: "leaf", x: 330, y: 470, size: 90, rot: -20 },
]);
const og = `<!doctype html><meta charset="utf-8"><style>${fontCss}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Figtree,sans-serif;color:#1f1a17;background:#fff8f1;position:relative}
.b{position:absolute;border-radius:50%;filter:blur(70px)}
.b1{width:620px;height:620px;left:-160px;top:-220px;background:#ffe3bd}
.b2{width:560px;height:560px;right:-120px;bottom:-240px;background:#fcd5e0}
.b3{width:420px;height:420px;left:380px;bottom:-260px;background:#e3dbff}
.wrap{position:relative;display:flex;height:100%;padding:64px 70px}
.left{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:14px;font:800 30px Bricolage;letter-spacing:-.01em}
.brand i{width:46px;height:46px;border-radius:13px;background:#f2631c;color:#fff;display:grid;place-items:center;font-style:normal;font-size:26px}
h1{font:800 94px/0.98 Bricolage;letter-spacing:-.035em;max-width:640px}
h1 span{color:#f2631c}
p{font:600 29px/1.35 Figtree;color:#6e655e;max-width:600px}
.art{width:520px;height:520px;align-self:center;position:relative;margin-right:-10px}
.card{position:absolute;inset:0;border-radius:56px;background:linear-gradient(145deg,#b34a10,#e98a2c);transform:rotate(3deg);box-shadow:0 30px 60px -30px rgba(120,50,0,.5)}
.art svg{position:absolute;inset:0}
</style>${FILTER}
<div class="b b1"></div><div class="b b2"></div><div class="b b3"></div>
<div class="wrap"><div class="left"><div class="brand"><i>S</i>Shivang's picks</div>
<div><h1>What should you <span>order today?</span></h1></div>
<p>Shivang's go-to places around Manikonda, Hyderabad. One tap to order.</p></div>
<div class="art"><div class="card"></div>${ogStickers}</div></div>`;
shot("og", og, 1200, 630, join(root, "public/og.png"));

// ---- app icon (full bleed, food sticker in the middle so it also works as a "maskable" icon) ----
const iconSvg = (size: number) => stickersSvg(size, size, [{ kind: "handi", x: size / 2, y: size * 0.5, size: size * 0.6, rot: -4 }, { kind: "sparkle", x: size * 0.74, y: size * 0.24, size: size * 0.15, rot: 0 }]);
const iconHtml = (size: number) => `<!doctype html><meta charset="utf-8"><style>*{margin:0}body{width:${size}px;height:${size}px;overflow:hidden;background:linear-gradient(150deg,#f97a2c,#e0510d)}svg{display:block}</style>${FILTER}${iconSvg(size)}`;
shot("icon-512", iconHtml(512), 512, 512, join(root, "public/icon-512.png"));
shot("icon-192", iconHtml(192), 192, 192, join(root, "public/icon-192.png"));
shot("icon-180", iconHtml(180), 180, 180, join(root, "public/apple-touch-icon.png"));

// ---- favicon (vector, so it stays sharp in the tab) ----
const fav = renderToString(
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97a2c" /><stop offset="1" stop-color="#e0510d" /></linearGradient></defs>
    <rect width="64" height="64" rx="14" fill="url(#g)" />
    <g transform="translate(10 12) scale(0.66)">
      <rect x="3" y="28" width="7" height="7" rx="3.5" fill="#8A4520" /><rect x="54" y="28" width="7" height="7" rx="3.5" fill="#8A4520" />
      <path d="M10 30H54C56 46 46 58 32 58C18 58 8 46 10 30Z" fill="#fff" /><path d="M15 27C17 11 47 11 49 27Z" fill="#FFF1D6" /><rect x="8" y="25" width="48" height="7" rx="3.5" fill="#FFE2B8" />
    </g>
  </svg>,
);
writeFileSync(join(root, "public/favicon.svg"), fav + "\n");
console.log("wrote public/favicon.svg");
