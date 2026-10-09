import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "How results are checked", description: "What a match means, what it doesn’t, and how to verify a lead." };

export default function HowItWorks() {
  return (
    <Prose title="How results are checked">
      <p>Every search sends the same identifier to each source at the same moment and records one of three answers. Knowing which answer you got matters more than the count of matches.</p>
      <h2>Three possible answers</h2>
      <ul>
        <li><strong>Found.</strong> The source gave a positive signal for this exact identifier: a profile in its API, a profile page, or a record. Where it exposes public fields (name, avatar, bio, counts) you see them on the card.</li>
        <li><strong>No match.</strong> The source gave a recognisable “does not exist” answer, such as a 404 from its API.</li>
        <li><strong>Didn’t answer.</strong> The source blocked us, rate-limited us, showed a bot challenge, timed out or returned something we couldn’t read. This says nothing about whether an account exists. Run the search again later.</li>
      </ul>
      <h2>Why a plain “page loaded” isn’t enough</h2>
      <p>Many sites return the same success code for a real profile, a login wall and a “user not found” page. Each source here has its own check: an official API where one exists, or a specific marker in the response. Bot-challenge pages are detected and treated as “didn’t answer”, never as found.</p>
      <h2>How the checks stay honest</h2>
      <p>Each source has two test cases: an account known to exist and a made-up name that shouldn’t. A daily job runs both. A source that reports the made-up name as found, or misses the real one, is switched off until it’s fixed, and it doesn’t count towards coverage.</p>
      <h2>Confidence labels</h2>
      <ul>
        <li><strong>Strong match:</strong> confirmed through an API or a profile-specific marker.</li>
        <li><strong>Likely:</strong> the profile URL answered normally and the site is known to return proper “not found” errors.</li>
        <li><strong>Lead to check:</strong> a guess we derived, such as the part of an email before the @ used as a username.</li>
      </ul>
      <h2>A match is not an identity</h2>
      <p>The same handle on two sites can belong to two different people. Before you connect accounts:</p>
      <ol>
        <li>Open the original profile and read it in context.</li>
        <li>Compare the exact identifier, not a similar display name.</li>
        <li>Look for independent links: a profile that links to the other, the same unusual avatar, a shared website.</li>
        <li>Write down when you saw it and what is confirmed versus inferred.</li>
      </ol>
      <h2>What we never do</h2>
      <p>No private data, no password-reset probing, no CAPTCHA solving, no logging in as anyone. Email searches only use public signals (Gravatar, published PGP keys, public commit metadata, the domain’s mail setup). Findings are deleted six hours after a search.</p>
      <p>Ready? <Link href="/search/">Start a search</Link>.</p>
    </Prose>
  );
}
