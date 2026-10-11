import type { Metadata } from "next";
import { Page } from "@/components/shell";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <Page>
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <p className="eyebrow">404</p>
        <h1 className="text-2xl font-semibold text-text">Page not found</h1>
        <p className="text-text-muted">That link is broken or the page moved.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <LinkButton href="/">Go home</LinkButton>
          <LinkButton href="/tools/" variant="secondary">Browse the tools</LinkButton>
        </div>
      </div>
    </Page>
  );
}
