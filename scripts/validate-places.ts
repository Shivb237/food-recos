import { readFileSync } from "node:fs";
import { placesFileSchema, crossCheck } from "../shared/schema";

const raw = JSON.parse(readFileSync(new URL("../data/places.json", import.meta.url), "utf8"));
const parsed = placesFileSchema.safeParse(raw);
if (!parsed.success) {
  console.error("data/places.json does not match the schema:");
  for (const i of parsed.error.issues) console.error(`  ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}
const { errors, warnings } = crossCheck(parsed.data);
warnings.forEach((w) => console.warn(`warn: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`error: ${e}`));
  process.exit(1);
}
console.log(`places.json OK: ${parsed.data.places.length} places, ${parsed.data.sections.length} sections, ${parsed.data.moods.length} moods`);
