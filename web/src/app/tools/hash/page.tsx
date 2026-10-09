"use client";

import { useEffect, useState } from "react";
import { ToolShell, RecordsTable } from "@/components/tool-layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input } from "@/components/ui/primitives";
import { digest, identifyHash, pwnedCount } from "@/lib/client-tools";

export default function HashTool() {
  const [hash, setHash] = useState("");
  const [text, setText] = useState("");
  const [hashes, setHashes] = useState<{ name: string; value: string }[]>([]);
  const [pw, setPw] = useState("");
  const [pwResult, setPwResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const guesses = hash.trim() ? identifyHash(hash) : [];

  useEffect(() => {
    let live = true;
    if (!text) { setHashes([]); return; }
    Promise.all((["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const).map(async (a) => ({ name: a, value: await digest(a, text) }))).then((h) => live && setHashes(h));
    return () => { live = false; };
  }, [text]);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setPwResult(null);
    try {
      const n = await pwnedCount(pw);
      setPwResult(n ? `Found in ${n.toLocaleString()} breached password records. Don’t use it anywhere.` : "Not found in known breaches. That doesn’t make it strong.");
    } catch (err) { setPwResult((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <ToolShell slug="hash">
      <section aria-labelledby="h-id" className="flex flex-col gap-3">
        <h2 id="h-id" className="text-base">Identify a hash</h2>
        <Input label="Hash" hideLabel placeholder="5f4dcc3b5aa765d61d8327deb882cf99" value={hash} onChange={(e) => setHash(e.target.value)} spellCheck={false} maxLength={300} />
        {hash.trim() && <div className="flex flex-wrap gap-2">{guesses.length ? guesses.map((g) => <Badge key={g} tone="accent">{g}</Badge>) : <span className="text-sm text-text-muted">No common format matches.</span>}</div>}
      </section>

      <section aria-labelledby="h-make" className="flex flex-col gap-3">
        <h2 id="h-make" className="text-base">Hash some text</h2>
        <Input label="Text" hideLabel placeholder="Type or paste text" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        {hashes.length > 0 && <RecordsTable records={hashes} />}
      </section>

      <section aria-labelledby="h-pw" className="flex flex-col gap-3">
        <h2 id="h-pw" className="text-base">Has a password been breached?</h2>
        <p className="text-sm text-text-muted">Your browser hashes the password and sends only the first 5 characters of the hash to Have I Been Pwned’s free range API. The password itself never leaves this page.</p>
        <form onSubmit={check} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input className="flex-1" label="Password" type="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button type="submit" loading={busy} disabled={!pw}>Check</Button>
        </form>
        {pwResult && <Card className="p-4 text-sm text-text" role="status">{pwResult}</Card>}
      </section>
    </ToolShell>
  );
}
