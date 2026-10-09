import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, KeyRound, Wrench } from "lucide-react";
import { Page, PageHeader } from "@/components/shell";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "API", description: "Run username, email and domain searches from your own code. Free API keys." };

const CARDS = [
  { href: "/docs/api/", icon: BookOpen, title: "API reference", body: "Endpoints, streaming, the result format and errors, with copy-paste examples." },
  { href: "/settings/api-keys/", icon: KeyRound, title: "API keys", body: "Create and revoke the keys your scripts use. Free for every account." },
  { href: "/how-it-works/", icon: Wrench, title: "How results are checked", body: "What found, no match and didn’t answer mean, so your code can treat them correctly." },
];

export default function Docs() {
  return (
    <Page>
      <PageHeader title="API" sub="The same engine as the web app, as JSON. Search, stream findings as they arrive, and plug them into your own tooling." />
      <ul className="grid gap-4 md:grid-cols-3">
        {CARDS.map(({ href, icon: Icon, title, body }) => (
          <li key={href}><Link href={href} className="block h-full"><Card interactive className="flex h-full flex-col gap-2 p-5"><Icon className="size-5 text-accent" aria-hidden /><h2 className="text-base font-medium text-text">{title}</h2><p className="text-sm text-text-muted">{body}</p></Card></Link></li>
        ))}
      </ul>
    </Page>
  );
}
