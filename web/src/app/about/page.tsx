import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <Prose title="About">
      <p>QuarryFind is a free open-source-intelligence search tool for investigators, security teams, journalists and researchers. It checks a username, email address or domain against public sources and shows you what each one says, live.</p>
      <p>It is free with no plans or credits. Accounts exist to keep your history and cases private to you, and so that rate limits can stop the service being abused.</p>
      <p>Search results are deleted after six hours; the search history list after 90 days. Read <Link href="/how-it-works/">how results are checked</Link> and the <Link href="/privacy/">privacy policy</Link>.</p>
    </Prose>
  );
}
