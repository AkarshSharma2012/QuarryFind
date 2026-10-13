"use client";

import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { data, useUser } from "@/lib/data";
import { Page, PageHeader, RequireUser } from "@/components/shell";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

// One owner account (see password-gate.tsx), so there's no "delete account": that would lock
// the owner out until the account is recreated in the Supabase dashboard.
function Settings() {
  const user = useUser();
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" />
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-base">Account</h2><p className="text-sm text-text-muted">Signed in as <span className="text-text">{user?.email}</span></p></div>
        <Button variant="secondary" icon={<LogOut className="size-4" aria-hidden />} onClick={async () => { await data.signOut(); router.push("/"); }}>Sign out</Button>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-base">API keys</h2><p className="text-sm text-text-muted">Run searches from your own scripts.</p></div>
        <LinkButton href="/settings/api-keys/" variant="secondary" icon={<KeyRound className="size-4" aria-hidden />}>Manage keys</LinkButton>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return <Page><RequireUser what="settings"><Settings /></RequireUser></Page>;
}
