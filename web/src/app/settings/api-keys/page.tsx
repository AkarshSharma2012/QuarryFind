"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Plus } from "lucide-react";
import { data, DataError, type ApiKey } from "@/lib/data";
import { Page, PageHeader, RequireUser } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CodeBlock, EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";

function Keys() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [revoke, setRevoke] = useState<ApiKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => data.listApiKeys().then(setKeys);
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { const r = await data.createApiKey(name); setSecret(r.key); setOpen(false); setName(""); load(); }
    catch (e) { setError(e instanceof DataError ? e.message : "Couldn’t create the key."); }
  };

  return (
    <>
      <PageHeader title="API keys" sub={<>Keys let your scripts run searches. Free, like everything else. See the <Link href="/docs/api/" className="text-accent hover:underline">API reference</Link>.</>}
        actions={<Button onClick={() => setOpen(true)} icon={<Plus className="size-4" aria-hidden />}>Create key</Button>} />
      {keys === null ? <Skeleton className="h-24" /> : keys.length === 0 ? (
        <Card><EmptyState icon={<KeyRound className="size-8" />} title="No API keys" body="Create a key to call the API from your own tools." /></Card>
      ) : (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-subtle">
              <tr><th scope="col" className="px-4 py-3 font-medium">Name</th><th scope="col" className="px-4 py-3 font-medium">Key</th><th scope="col" className="px-4 py-3 font-medium">Created</th><th scope="col" className="px-4 py-3 font-medium">Last used</th><th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-text-muted">{k.prefix}…</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-text-muted">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "never"}</td>
                  <td className="px-4 py-3 text-right">{k.revoked_at ? <Badge>Revoked</Badge> : <Button size="sm" variant="ghost" onClick={() => setRevoke(k)} aria-label={`Revoke ${k.name}`}>Revoke</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Create API key"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></>}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Threat intel pipeline" maxLength={60} error={error ?? undefined} />
      </Dialog>

      <Dialog open={!!secret} onClose={() => setSecret(null)} title="Your new API key" footer={<Button onClick={() => setSecret(null)}>I’ve stored it</Button>}>
        <div className="flex flex-col gap-3">
          <p>Copy it now. For your safety it won’t be shown again; if you lose it, revoke it and create another.</p>
          {secret && <CodeBlock code={secret} lang="key" />}
        </div>
      </Dialog>

      <Dialog open={!!revoke} onClose={() => setRevoke(null)} title="Revoke this key?"
        footer={<><Button variant="ghost" onClick={() => setRevoke(null)}>Cancel</Button><Button variant="danger" onClick={async () => { await data.revokeApiKey(revoke!.id); setRevoke(null); load(); }}>Revoke</Button></>}>
        Anything using “{revoke?.name}” stops working immediately.
      </Dialog>
    </>
  );
}

export default function ApiKeysPage() {
  return <Page><RequireUser what="API keys"><Keys /></RequireUser></Page>;
}
