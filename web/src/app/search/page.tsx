"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Page, PageHeader, RequireUser } from "@/components/shell";
import { SearchForm } from "@/components/search-form";
import type { SearchType } from "@/lib/types";

function NewSearch() {
  const p = useSearchParams();
  const t = p.get("type");
  const type: SearchType = t === "email" || t === "domain" ? t : "username";
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <PageHeader title="New search" sub="Results stream in as each source answers. Nothing is cached, so every search is live." />
      <SearchForm initialType={type} initialQuery={p.get("q") ?? ""} />
      <p className="text-sm text-text-muted">
        A match is a lead, not proof. Read <Link href="/how-it-works/" className="text-accent hover:underline">how results are checked</Link> before you connect accounts to a person.
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Page>
      <RequireUser what="search">
        <Suspense><NewSearch /></Suspense>
      </RequireUser>
    </Page>
  );
}
