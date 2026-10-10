// POST {tool, input} → {ok, result | error}. Anonymous allowed except profile
// tools (github, reddit), which need a free account. 30 calls/min per IP.
import { runTool, type ToolName } from "../_shared/engine/lookups.ts";
import { admin, clientIp, cors, envRecord, err, json, userFromJwt } from "../_shared/server.ts";

const ACCOUNT_ONLY = new Set(["github", "reddit"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return err(req, 405, "method_not_allowed", "Use POST.");
  const b = await req.json().catch(() => ({}));
  const tool = String(b.tool ?? "") as ToolName;

  const user = await userFromJwt(req);
  if (ACCOUNT_ONLY.has(tool) && !user) return err(req, 401, "unauthorized", "Sign in to use this tool.");

  const { data: allowed } = await admin().rpc("hit_rate_limit", { p_bucket: `tools:${user?.id ?? clientIp(req)}`, p_limit: 30 });
  if (allowed === false) return err(req, 429, "rate_limited", "Too many lookups in the last minute. Wait a moment.");

  const ctx = { fetch: globalThis.fetch.bind(globalThis), timeoutMs: 10000, env: envRecord() };
  const r = await runTool(ctx, tool, String(b.input ?? ""));
  return json(req, 200, r);
});
