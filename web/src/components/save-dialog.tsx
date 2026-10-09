"use client";

import { useEffect, useState } from "react";
import { data, DataError, type Case } from "@/lib/data";
import type { SearchResult, SearchRun } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

/** Pick or create a case, then save the result into it. */
export function SaveDialog({ run, result, onClose, onSaved }: {
  run: SearchRun; result: SearchResult | null; onClose: () => void; onSaved: (r: SearchResult) => void;
}) {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [pick, setPick] = useState<string>("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!result) return;
    data.listCases().then((cs) => {
      setCases(cs);
      setPick(cs[0]?.id ?? "new");
      setName(cs.length ? "" : `${run.query}`);
    });
  }, [result, run.query]);

  const save = async () => {
    if (!result) return;
    setBusy(true); setError(null);
    try {
      let id = pick;
      if (pick === "new") id = (await data.createCase(name)).id;
      await data.saveToCase(id, run, result);
      toast("Saved to case", "success");
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof DataError ? e.message : "Couldn’t save. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog
      open={!!result}
      onClose={onClose}
      title="Save to a case"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy} disabled={pick === "new" && !name.trim()}>Save</Button></>}
    >
      <div className="flex flex-col gap-3">
        <p>Cases keep a copy of the finding after search results expire (6 hours).</p>
        {cases === null ? <p>Loading cases…</p> : (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Case</legend>
            {cases.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-text">
                <input type="radio" name="case" value={c.id} checked={pick === c.id} onChange={() => setPick(c.id)} className="accent-[var(--c-accent)]" />
                <span className="truncate">{c.name}</span>
                <span className="text-xs text-text-subtle">{c.item_count ?? 0} saved</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-text">
              <input type="radio" name="case" value="new" checked={pick === "new"} onChange={() => setPick("new")} className="accent-[var(--c-accent)]" />
              New case
            </label>
            {pick === "new" && <Input label="Case name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />}
          </fieldset>
        )}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}
