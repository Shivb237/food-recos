import { socialHandler } from "../server/routes";

// Vercel runs this file as a function. All the logic lives in server/social.ts.
export default { fetch: socialHandler };
