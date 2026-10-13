// Creates fresh confirmed users for the run, signs each in once through the
// Auth API and saves a Playwright storage state with the Supabase session, so
// tests start signed in without hammering the sign-in endpoint.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";

export const BASE = "http://localhost:4317";
const OWNER_EMAIL = "owner@quarryfind.example"; // password-gate.tsx default
// 0 search + public pages, 1 RLS viewer, 2 cases, 3 keys, 4 (spare), 5 revoked session
const USERS = 6;

function loadEnv() {
  try {
    for (const line of readFileSync(".env.test.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* use the real environment */ }
}

export default async function globalSetup() {
  loadEnv();
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !anon) throw new Error("Start Supabase and create .env.test.local first (see replica/autopilot.md)");
  const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  mkdirSync("e2e/.auth", { recursive: true });
  const users = [];
  for (let i = 0; i < USERS; i++) {
    const email = `e2e-${i}-${randomUUID().slice(0, 8)}@example.test`;
    const password = randomBytes(12).toString("base64url");
    const created = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!created.ok) throw new Error(`could not create test user: ${created.status}`);
    const tok = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: anon, "content-type": "application/json" }, body: JSON.stringify({ email, password }),
    });
    if (!tok.ok) throw new Error(`could not sign in test user: ${tok.status}`);
    const session = await tok.json();
    writeFileSync(`e2e/.auth/user${i}.json`, JSON.stringify({
      cookies: [],
      origins: [{ origin: BASE, localStorage: [{ name: storageKey, value: JSON.stringify(session) }] }],
    }));
    users.push({ email, password });
  }
  writeFileSync("e2e/.auth/users.json", JSON.stringify(users));

  // The owner account the password screen signs into (password-gate.tsx), with a fresh password.
  const admin = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
  const ownerPassword = randomBytes(12).toString("base64url");
  const list = await (await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json() as { users: { id: string; email: string }[] };
  const existing = list.users.find((u) => u.email === OWNER_EMAIL);
  const res = existing
    ? await fetch(`${url}/auth/v1/admin/users/${existing.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: ownerPassword }) })
    : await fetch(`${url}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: OWNER_EMAIL, password: ownerPassword, email_confirm: true }) });
  if (!res.ok) throw new Error(`could not set up the owner account: ${res.status}`);
  writeFileSync("e2e/.auth/owner.json", JSON.stringify({ email: OWNER_EMAIL, password: ownerPassword }));
}
