import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "../web/src/lib/csp.ts";

describe("contentSecurityPolicy", () => {
  it("allows only our backend (HTTP and websockets) and the password range API", () => {
    const csp = contentSecurityPolicy({ NEXT_PUBLIC_SUPABASE_URL: "https://ref.supabase.co" });
    const connect = csp.split("; ").find((d) => d.startsWith("connect-src"));
    expect(connect).toBe("connect-src 'self' https://ref.supabase.co wss://ref.supabase.co https://api.pwnedpasswords.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
  it("covers the local dev API and local Supabase", () => {
    const csp = contentSecurityPolicy({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321", NEXT_PUBLIC_DEV_API: "http://localhost:8787" });
    expect(csp).toContain("http://127.0.0.1:55321 http://localhost:8787 ws://127.0.0.1:55321 ws://localhost:8787");
  });
});
