// Writes web/src/lib/sources.json from the engine registry, so marketing
// pages list the real sources. Run after adding modules: npm run sources
import { writeFileSync } from "node:fs";
import { allModules } from "../supabase/functions/_shared/engine/index.ts";

const out = allModules.map((m) => ({ name: m.name, platform: m.platform, category: m.category, types: m.types, deep: !!m.deep }));
writeFileSync(new URL("../web/src/lib/sources.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`${out.length} sources written`);
