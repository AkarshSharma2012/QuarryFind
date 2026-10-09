"use client";

import { useState } from "react";
import Link from "next/link";
import { ToolShell, RecordsTable } from "@/components/tool-layout";
import { Badge, Card } from "@/components/ui/primitives";
import { analyzeHeaders } from "@/lib/client-tools";

export default function EmailHeadersTool() {
  const [raw, setRaw] = useState("");
  const r = raw.trim() ? analyzeHeaders(raw) : null;
  return (
    <ToolShell slug="email-headers">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="hdr" className="text-sm text-text-muted">Raw headers</label>
        <textarea id="hdr" value={raw} onChange={(e) => setRaw(e.target.value)} rows={10} spellCheck={false}
          placeholder={"In most mail apps: open the message → More → Show original / View source. Paste everything above the body."}
          className="w-full rounded-md border border-border-input bg-surface p-3 font-mono text-xs text-text placeholder:text-text-subtle" />
        <p className="text-xs text-text-subtle">Analysed in your browser. Nothing is uploaded.</p>
      </div>
      {r && (
        <div className="flex flex-col gap-6">
          {r.warnings.length > 0 && (
            <Card className="flex flex-col gap-1 border-warning/40 p-4">
              {r.warnings.map((w) => <p key={w} className="text-sm text-warning">{w}</p>)}
            </Card>
          )}
          {r.auth.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {r.auth.map((a) => <Badge key={a.name} tone={a.value === "pass" ? "success" : a.value === "neutral" ? "neutral" : "danger"}>{a.name}: {a.value}</Badge>)}
            </div>
          )}
          <RecordsTable records={[
            ["Subject", r.subject], ["From", r.from], ["To", r.to], ["Reply-To", r.replyTo], ["Return-Path", r.returnPath], ["Date", r.date], ["Message-ID", r.messageId],
          ].filter(([, v]) => v).map(([name, value]) => ({ name: name!, value: value! }))} />
          {r.hops.length > 0 && (
            <section aria-labelledby="h-hops">
              <h2 id="h-hops" className="mb-3 text-base">Route (oldest first)</h2>
              <ol className="flex flex-col gap-2">
                {r.hops.map((h, i) => (
                  <li key={i}><Card className="p-3 font-mono text-xs">
                    <p className="text-text">{i + 1}. {h.from ?? "?"} → {h.by ?? "?"} {h.with && <span className="text-text-subtle">({h.with})</span>}</p>
                    <p className="text-text-subtle">{h.date}{h.delay !== undefined && <span className={h.delay > 300 ? " text-warning" : ""}> · +{h.delay}s</span>}</p>
                  </Card></li>
                ))}
              </ol>
            </section>
          )}
          {r.ips.length > 0 && (
            <section aria-labelledby="h-ips">
              <h2 id="h-ips" className="mb-3 text-base">Public IPs in the route</h2>
              <ul className="flex flex-wrap gap-2">{r.ips.map((ip) => <li key={ip}><Link href={`/tools/ip/?q=${ip}`} className="rounded-pill border border-border px-3 py-1 font-mono text-sm text-accent hover:border-accent">{ip}</Link></li>)}</ul>
            </section>
          )}
        </div>
      )}
    </ToolShell>
  );
}
