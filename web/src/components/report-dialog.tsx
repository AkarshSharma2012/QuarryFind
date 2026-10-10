"use client";

import { useState } from "react";
import { data, DataError, type ReportKind } from "@/lib/data";
import type { SearchResult, SearchType } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Fix #2: tell us a result is wrong. Reports show on /sources and flag the source for re-testing. */
export function ReportDialog({ result, queryType, onClose }: { result: SearchResult | null; queryType: SearchType; onClose: () => void }) {
  const [kind, setKind] = useState<ReportKind>("not_this_account");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const send = async () => {
    if (!result) return;
    setBusy(true); setError(null);
    try {
      await data.reportResult({ module: result.source, kind, query_type: queryType, note: note.trim() });
      toast("Thanks. The source will be re-checked.", "success");
      setNote(""); onClose();
    } catch (e) {
      setError(e instanceof DataError ? e.message : "Couldn’t send the report.");
    } finally { setBusy(false); }
  };

  const options: [ReportKind, string][] = [
    ["not_this_account", "This account doesn’t exist, or the page isn’t a profile"],
    ["account_missing", "The source missed an account that does exist"],
    ["other", "Something else is wrong"],
  ];

  return (
    <Dialog open={!!result} onClose={onClose} title={`Report a result from ${result?.platform ?? "this source"}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={send} loading={busy}>Send report</Button></>}>
      <div className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-text">What’s wrong?</legend>
          {options.map(([v, l]) => (
            <label key={v} className="flex items-start gap-2 text-text">
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="mt-1 accent-[var(--c-accent)]" />
              {l}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-note" className="text-text-muted">Details (optional)</label>
          <textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
            className="rounded-md border border-border-input bg-surface p-2 text-sm text-text" />
          <p className="text-xs text-text-subtle">Don’t include personal details about the person searched for. Only the source, the problem type and this note are sent.</p>
        </div>
        {error && <p role="alert" className="text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}
