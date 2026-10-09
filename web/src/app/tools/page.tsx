import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/shell";
import { Badge, Card } from "@/components/ui/primitives";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = { title: "Free OSINT tools", description: "Free single-purpose OSINT tools: IP lookup, DNS, WHOIS, subdomains, photo metadata, username variations and more." };

export default function ToolsPage() {
  const groups = [...new Set(TOOLS.map((t) => t.group))];
  return (
    <Page>
      <div className="mb-10 max-w-2xl">
        <h1 className="text-xl text-text">Free tools</h1>
        <p className="mt-1 text-sm text-text-muted">Focused tools for one question at a time. All free, no limits beyond basic abuse protection. Tools marked “in your browser” never send your input anywhere.</p>
      </div>
      <div className="flex flex-col gap-12">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="mb-4 text-lg">{g}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.filter((t) => t.group === g).map((t) => (
                <li key={t.slug}>
                  <Link href={`/tools/${t.slug}/`} className="block h-full">
                    <Card interactive className="flex h-full flex-col gap-2 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-medium text-text">{t.title}</h3>
                        {!t.server && <Badge tone="success">In your browser</Badge>}
                        {t.account && <Badge tone="outline">Free account</Badge>}
                      </div>
                      <p className="text-sm text-text-muted">{t.blurb}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}
