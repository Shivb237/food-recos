import { socialHandler } from "../routes";

// Entry point for /api/social. `npm run build:api` bundles this (with everything it imports, JSON data included) into
// api/social.js, which is what Vercel runs. Vercel's runtime is strict ESM, so unbundled relative imports would fail there.
export default { fetch: socialHandler };
