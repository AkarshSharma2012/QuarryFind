import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Page, PageHeader } from "@/components/shell";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = { title: "Free OSINT tools", description: "Free single-purpose OSINT tools: IP lookup, DNS, WHOIS, subdomains, photo metadata, username variations and more." };

export default function ToolsPage() {
  const groups = [...new Set(TOOLS.map((t) => t.group))];
  return (
    <Page>
      <PageHeader title="Tools" sub="Single-purpose utilities for follow-up questions. Tools marked local process your input in the browser and send nothing." />
      <div className="flex flex-col gap-12">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="eyebrow mb-3">{g}</h2>
            <ul className="divide-y divide-border border-y border-border">
              {TOOLS.filter((t) => t.group === g).map((t) => (
                <li key={t.slug}>
                  <Link href={`/tools/${t.slug}/`} className="group grid items-baseline gap-1 py-4 sm:grid-cols-[240px_1fr_120px] sm:gap-8">
                    <span className="text-[15px] font-medium text-text group-hover:text-accent">{t.title}</span>
                    <span className="text-sm text-text-muted">{t.blurb}</span>
                    <span className="flex items-center justify-end gap-3 font-mono text-[11px] text-text-subtle">
                      {!t.server && "local"}{t.account && "account"}
                      <ArrowRight className="size-4 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                    </span>
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
