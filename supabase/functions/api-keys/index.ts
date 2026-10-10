// POST {name} → {key, record} (key shown once). DELETE ?id= → revoke own key.
import { admin, cors, err, json, sha256Hex, userFromJwt } from "../_shared/server.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const user = await userFromJwt(req);
  if (!user) return err(req, 401, "unauthorized", "Sign in first.");
  const db = admin();

  if (req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    const name = String(b.name ?? "").trim().slice(0, 60) || "Default";
    const { count } = await db.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("revoked_at", null);
    if ((count ?? 0) >= 10) return err(req, 400, "too_many_keys", "You can have up to 10 active keys. Revoke one first.");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = "qf_live_" + [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
    const { data, error } = await db.from("api_keys")
      .insert({ user_id: user.id, name, prefix: key.slice(0, 12), key_hash: await sha256Hex(key) })
      .select("id, name, prefix, created_at, last_used_at, revoked_at").single();
    if (error) return err(req, 500, "server_error", "Couldn’t create the key.");
    return json(req, 200, { key, record: data });
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[0-9a-f-]{36}$/.test(id)) return err(req, 400, "invalid_request", "Missing key id.");
    const { error } = await db.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).is("revoked_at", null);
    if (error) return err(req, 500, "server_error", "Couldn’t revoke the key.");
    return new Response(null, { status: 204, headers: cors(req) });
  }

  return err(req, 405, "method_not_allowed", "Use POST or DELETE.");
});
