import type { ReactNode } from "react";
import { Page } from "@/components/shell";

/** Long-form page: legal, methodology, about. */
export function Prose({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <Page narrow>
      <article className="flex flex-col gap-4 text-sm leading-6 text-text-muted [&_a]:text-accent [&_a:hover]:underline [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_strong]:text-text">
        <header className="mb-2">
          <h1 className="text-xl text-text">{title}</h1>
          {updated && <p className="mt-1 text-xs text-text-subtle">Last updated {updated}</p>}
        </header>
        {children}
      </article>
    </Page>
  );
}
