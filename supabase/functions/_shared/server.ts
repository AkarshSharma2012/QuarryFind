// Shared helpers for Edge Functions (Deno).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET") ?? SERVICE_KEY;

export function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000").split(",").map((s) => s.trim());

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "access-control-allow-origin": ALLOWED.includes(origin) || ALLOWED.includes("*") ? origin || "*" : ALLOWED[0],
    "access-control-allow-headers": "authorization, x-api-key, apikey, content-type, x-client-info",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    vary: "origin",
  };
}

export function json(req: Request, status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors(req), ...extra } });
}

export const err = (req: Request, status: number, code: string, message: string) => json(req, status, { error: code, message });

/** The signed-in user from the Supabase JWT, or null. */
export async function userFromJwt(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token === ANON_KEY) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** API key from Authorization: Bearer qf_live_… or X-API-Key → owner id, or null. */
export async function userFromApiKey(req: Request): Promise<string | null> {
  const raw = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!/^qf_live_[0-9a-f]{48}$/.test(raw)) return null;
  const { data } = await admin().rpc("api_key_owner", { p_hash: await sha256Hex(raw) });
  return (data as string | null) ?? null;
}

export function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

/** Map Postgres exceptions raised by start_search to API errors. */
export function startError(message: string): [number, string, string] {
  if (message.includes("rate_limited")) return [429, "rate_limited", "Too many searches in the last minute. Wait a moment and try again."];
  if (message.includes("too_many_running")) return [429, "rate_limited", "You already have 3 searches running. Wait for one to finish."];
  return [500, "server_error", "Couldn’t start the search."];
}

export function envRecord(): Record<string, string | undefined> {
  return { GITHUB_TOKEN: Deno.env.get("GITHUB_TOKEN"), GRAVATAR_API_KEY: Deno.env.get("GRAVATAR_API_KEY") };
}
