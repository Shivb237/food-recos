/**
 * Runs the BUILT site the way Vercel will: static files from dist/, the same headers as vercel.json (including the
 * security policy), the single-page fallback, and the real /api handlers. Use it to catch problems before deploying.
 *
 *   npm run build && npm run preview:prod     then open http://localhost:4173
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createRoutes, bundledData } from "../server/routes";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const rules = vercel.headers.map((h) => ({ re: new RegExp(`^${h.source.replace(/\(\.\*\)/g, ".*")}$`), headers: h.headers }));
const routes = createRoutes(bundledData);
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  for (const r of rules) if (r.re.test(url.pathname)) for (const h of r.headers) res.setHeader(h.key, h.value);

  const api = routes[url.pathname];
  if (api) {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks);
    const out = await api(new Request(`http://localhost:4173${req.url}`, { method: req.method, headers: req.headers as Record<string, string>, body }));
    res.statusCode = out.status;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    return void res.end(Buffer.from(await out.arrayBuffer()));
  }

  let file = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dist)) return void res.writeHead(403).end();
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (extname(url.pathname)) return void res.writeHead(404).end("not found");
    file = join(dist, "index.html"); // single-page fallback, like the rewrite in vercel.json
  }
  res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
  res.end(readFileSync(file));
}).listen(4173, () => console.log("production preview on http://localhost:4173"));
