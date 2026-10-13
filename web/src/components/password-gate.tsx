"use client";

import { useEffect, useState } from "react";
import { Pickaxe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";

// Private-site gate. Only the SHA-256 of the password ships (NEXT_PUBLIC_GATE_HASH, set by the
// Pages workflow); no hash means no gate (local dev, tests). This keeps casual visitors out of a
// static site; it isn't access control — the account login protects searches and cases.
const HASH = process.env.NEXT_PUBLIC_GATE_HASH ?? "";
const KEY = "qf.gate";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function stored() { try { return localStorage.getItem(KEY); } catch { return null; } }

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">(HASH ? "checking" : "open");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (HASH) setState(stored() === HASH ? "open" : "locked"); }, []);

  if (state === "open") return <>{children}</>;
  if (state === "checking") return <div className="min-h-dvh bg-bg" aria-busy="true" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((await sha256(value)) !== HASH) { setError("That’s not the password."); setValue(""); return; }
    try { localStorage.setItem(KEY, HASH); } catch { /* still opens for this visit */ }
    setState("open");
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-4" noValidate>
        <div className="flex items-center gap-2 text-text"><Pickaxe className="size-5 text-accent" aria-hidden /><span className="font-semibold">QuarryFind</span></div>
        <h1 className="text-lg text-text">This site is private</h1>
        <Input label="Password" type="password" autoComplete="current-password" autoFocus value={value} onChange={(e) => { setValue(e.target.value); setError(null); }} error={error ?? undefined} />
        <Button type="submit" disabled={!value}>Enter</Button>
      </form>
    </main>
  );
}
