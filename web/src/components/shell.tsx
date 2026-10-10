"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LogOut, Menu, Radar, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { data, useUser } from "@/lib/data";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { StatusDot } from "@/components/status-dot";

export const PRODUCT = "OsintSet";

const appLinks = [
  { href: "/search/", label: "Search" },
  { href: "/history/", label: "History" },
  { href: "/cases/", label: "Cases" },
  { href: "/tools/", label: "Tools" },
  { href: "/docs/", label: "API" },
];
const publicLinks = [
  { href: "/tools/", label: "Free tools" },
  { href: "/how-it-works/", label: "How it works" },
  { href: "/docs/", label: "API" },
];

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-text">
      <Radar className="size-[18px] text-accent" strokeWidth={2.25} aria-hidden />
      {PRODUCT}
    </Link>
  );
}

export function SiteNav() {
  const user = useUser();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = user ? appLinks : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1200px] items-center gap-8 px-4 sm:px-6">
        <Logo />
        <ul className="hidden items-center md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={path?.startsWith(l.href) ? "page" : undefined}
                className={clsx(
                  "relative flex h-14 items-center px-3 text-sm transition-colors",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:transition-colors",
                  path?.startsWith(l.href) ? "text-text after:bg-text" : "text-text-muted after:bg-transparent hover:text-text",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user === undefined ? <Skeleton className="h-8 w-28" /> : user ? (
            <>
              <Link href="/settings/" className="max-w-48 truncate text-sm text-text-muted hover:text-text" title={`Settings for ${user.email}`}>{user.email}</Link>
              <button type="button" onClick={async () => { await data.signOut(); router.push("/"); }} className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-sm text-text-muted hover:text-text">
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </>
          ) : (
            <>
              <LinkButton href="/sign-in/" variant="ghost" size="sm">Sign in</LinkButton>
              <LinkButton href="/sign-up/" size="sm">Create free account</LinkButton>
            </>
          )}
        </div>
        <button type="button" className="ml-auto rounded-sm p-2 text-text-muted md:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          <span className="sr-only">Menu</span>
        </button>
      </nav>
      {open && (
        <div id="mobile-nav" className="border-t border-border px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="block rounded-sm px-2 py-2 text-text-muted hover:text-text">{l.label}</Link></li>
            ))}
            <li className="mt-2 border-t border-border pt-2">
              {user ? (
                <><Link href="/settings/" onClick={() => setOpen(false)} className="block px-2 py-2 text-text-muted">Settings</Link><button type="button" onClick={async () => { await data.signOut(); setOpen(false); router.push("/"); }} className="px-2 py-2 text-text-muted">Sign out</button></>
              ) : (
                <div className="flex gap-2"><LinkButton href="/sign-in/" variant="secondary" size="sm">Sign in</LinkButton><LinkButton href="/sign-up/" size="sm">Create free account</LinkButton></div>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const cols = [
    { title: "Product", links: [["Search", "/search/"], ["Free tools", "/tools/"], ["API", "/docs/"], ["API reference", "/docs/api/"]] },
    { title: "Learn", links: [["How it works", "/how-it-works/"], ["Source status", "/sources/"], ["About", "/about/"]] },
    { title: "Legal", links: [["Terms", "/terms/"], ["Privacy", "/privacy/"]] },
  ];
  return (
    <footer className="mt-24 border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-text-muted">Free OSINT search for usernames, emails and domains. Public sources only.</p>
          <StatusDot />
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="eyebrow mb-3">{c.title}</h2>
            <ul className="flex flex-col gap-1.5">
              {c.links.map(([l, h]) => <li key={h}><Link href={h} className="text-sm text-text-muted hover:text-text">{l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto max-w-[1200px] px-4 pb-8 text-xs text-text-subtle">© {new Date().getFullYear()} {PRODUCT}. Use it lawfully and only for investigations you are allowed to run. Some site checks are derived from <a href="https://github.com/WebBreacher/WhatsMyName" className="underline hover:text-text" target="_blank" rel="noopener noreferrer">WhatsMyName</a> (CC BY-SA 4.0).</p>
    </footer>
  );
}

export function Page({ children, narrow, className }: { children: ReactNode; narrow?: boolean; className?: string }) {
  return (
    <>
      <a href="#main" className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-on-primary">Skip to content</a>
      <SiteNav />
      <main id="main" tabIndex={-1} className={clsx("mx-auto w-full px-4 py-10 outline-none sm:px-6", narrow ? "max-w-3xl" : "max-w-[1200px]", className)}>{children}</main>
      <Footer />
    </>
  );
}

/** Renders children only for signed-in users; otherwise a sign-in prompt. */
export function RequireUser({ children, what = "this page" }: { children: ReactNode; what?: string }) {
  const user = useUser();
  const path = usePathname();
  if (user === undefined) return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40" /></div>;
  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-xl">Sign in to use {what}</h1>
        <p className="text-sm text-text-muted">Accounts are free. They keep your history and cases private to you, and let us slow down abuse.</p>
        <div className="mt-2 flex gap-2">
          <LinkButton href={`/sign-in/?next=${encodeURIComponent(path ?? "/search/")}`}>Sign in</LinkButton>
          <LinkButton href={`/sign-up/?next=${encodeURIComponent(path ?? "/search/")}`} variant="secondary">Create free account</LinkButton>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        {sub && <p className="mt-2 max-w-[65ch] text-sm leading-6 text-text-muted">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}
