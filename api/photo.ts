import { photoHandler } from "../server/routes";

// Vercel runs this file as a function. All the logic lives in server/photo.ts.
export default { fetch: photoHandler };
