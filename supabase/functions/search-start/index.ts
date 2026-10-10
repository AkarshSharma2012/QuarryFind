// POST {type, query, deep} with the user's JWT → {run_id}
import { normalise } from "../_shared/engine/validate.ts";
import type { SearchType } from "../_shared/engine/types.ts";
import { cors, err, json, startError, userFromJwt } from "../_shared/server.ts";
import { BATCH, startRun } from "../_shared/runs.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return err(req, 405, "method_not_allowed", "Use POST.");
  const user = await userFromJwt(req);
  if (!user) return err(req, 401, "unauthorized", "Sign in to search.");

  const b = await req.json().catch(() => ({}));
  const type = String(b.type) as SearchType;
  if (!["username", "email", "domain"].includes(type)) return err(req, 400, "invalid_request", "Unknown search type.");
  const query = normalise(type, String(b.query ?? ""));
  if (!query) return err(req, 400, "invalid_request", `That isn’t a valid ${type}.`);

  try {
    const run = await startRun(user.id, type, query, Boolean(b.deep), "web");
    // The results page drives the batches (see search-batch).
    return json(req, 200, { run_id: run.id, modules_total: run.modules_total, batch_size: BATCH });
  } catch (e) {
    const [s, c, m] = startError(String((e as Error).message));
    return err(req, s, c, m);
  }
});
