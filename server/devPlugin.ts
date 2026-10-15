import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin } from "vite";

/** Serves /api/* from server/routes.ts inside `npm run dev`, so the real handlers run locally without Vercel. */
export function apiDevPlugin(): Plugin {
  return {
    name: "manikonda-api-dev",
    config(_, { mode }) {
      // Load .env.local into process.env (Vite only exposes VITE_* to client code, which is what we want for secrets).
      for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ""))) if (process.env[k] === undefined) process.env[k] = v;
    },
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith("/api/")) return next();
        try {
          const { devRoutes } = (await server.ssrLoadModule("/server/devRoutes.ts")) as typeof import("./devRoutes");
          const handler = devRoutes()[url.pathname];
          if (!handler) {
            res.statusCode = 404;
            return void res.end(JSON.stringify({ error: "not found" }));
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.ssrFixStacktrace(e as Error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "server error" }));
        }
      });
    },
  };
}
