import type { Metadata } from "next";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <Prose title="Privacy" updated="9 October 2026">
      <p><strong>Draft.</strong> Have this policy reviewed before launch.</p>
      <h2>What we keep about you</h2>
      <ul>
        <li>Your account: email address, and the name and avatar your sign-in provider shares.</li>
        <li>Search history: the query, its type and when you ran it, for 90 days, then deleted automatically.</li>
        <li>Search findings: deleted automatically six hours after the search.</li>
        <li>Cases and notes you create, until you delete them.</li>
        <li>API keys: stored as a one-way hash; we can’t read them back.</li>
      </ul>
      <h2>What we don’t do</h2>
      <p>We don’t sell or share your data, run ads, or use your searches for anything except running them for you and preventing abuse.</p>
      <h2>People who are searched for</h2>
      <p>We don’t build a database of people. Each search asks public sources in real time, and findings are deleted after six hours unless the searching user saves them to a private case.</p>
      <h2>Tools that run in your browser</h2>
      <p>The photo metadata, email header, phone number, variations, dork and hash tools process your input on your device. The breached-password check sends only the first five characters of a SHA-1 hash to Have I Been Pwned.</p>
      <h2>Deleting your data</h2>
      <p>Deleting your account deletes your history, cases and API keys immediately.</p>
    </Prose>
  );
}
