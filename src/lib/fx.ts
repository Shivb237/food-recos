/** Confetti and hearts on one fixed canvas. No library; does nothing under prefers-reduced-motion. */
interface Particle {
  x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number;
  c: string; heart: boolean; life: number; max: number; bar: boolean;
}

const PALETTE = ["#FF7A1A", "#FFC14D", "#E53958", "#6F4FE0", "#1FA463", "#2BB3D9"];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let running = false;

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function ensureCanvas() {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }
  const d = devicePixelRatio || 1;
  if (canvas.width !== Math.round(innerWidth * d) || canvas.height !== Math.round(innerHeight * d)) {
    canvas.width = Math.round(innerWidth * d);
    canvas.height = Math.round(innerHeight * d);
  }
  return ctx;
}

export interface BurstOptions { n?: number; spread?: number; hearts?: boolean; up?: number }

function burst(x: number, y: number, { n = 70, spread = 1, hearts = false, up = 1 }: BurstOptions = {}) {
  if (reducedMotion() || !ensureCanvas()) return;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * spread;
    const v = (hearts ? 4 : 6) + Math.random() * (hearts ? 4 : 7);
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * up, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      s: hearts ? 8 + Math.random() * 7 : 5 + Math.random() * 5,
      c: hearts ? (Math.random() < 0.7 ? "#E53958" : "#FF8FB1") : PALETTE[k % PALETTE.length]!,
      heart: hearts, life: 0, max: 70 + Math.random() * 40, bar: Math.random() < 0.5,
    });
  }
  if (!running) {
    running = true;
    requestAnimationFrame(tick);
  }
}

function heartPath(c: CanvasRenderingContext2D, s: number) {
  c.beginPath();
  c.moveTo(0, s * 0.3);
  c.bezierCurveTo(-s, -s * 0.4, -s * 0.4, -s, 0, -s * 0.35);
  c.bezierCurveTo(s * 0.4, -s, s, -s * 0.4, 0, s * 0.3);
  c.fill();
}

function tick() {
  const c = ctx;
  if (!c || !canvas) return;
  const d = devicePixelRatio || 1;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.scale(d, d);
  particles = particles.filter((p) => p.life < p.max && p.y < innerHeight + 40);
  for (const p of particles) {
    p.life++;
    p.vy += p.heart ? 0.12 : 0.22;
    p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx; p.y += p.vy; p.r += p.vr;
    c.save();
    c.globalAlpha = Math.max(0, 1 - p.life / p.max);
    c.translate(p.x, p.y);
    c.rotate(p.heart ? p.vx * 0.05 : p.r);
    c.fillStyle = p.c;
    if (p.heart) heartPath(c, p.s);
    else if (p.bar) c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    else { c.beginPath(); c.arc(0, 0, p.s / 2.4, 0, 7); c.fill(); }
    c.restore();
  }
  if (particles.length) requestAnimationFrame(tick);
  else {
    running = false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function burstAt(el: Element | null, opts?: BurstOptions) {
  const r = el?.getBoundingClientRect();
  burst(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2, opts);
}
