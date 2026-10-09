import type { Metadata } from "next";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <Prose title="Terms of use" updated="9 October 2026">
      <p><strong>Draft.</strong> Have these terms reviewed for your jurisdiction before launch.</p>
      <h2>Using the service</h2>
      <p>You may use the service only for lawful purposes and only to investigate people, accounts and organisations you have a legitimate reason and the authority to investigate, for example your own accounts, an authorised security assessment, fraud prevention, journalism or academic research.</p>
      <h2>You must not</h2>
      <ul>
        <li>stalk, harass, threaten, dox or discriminate against anyone;</li>
        <li>use results to make decisions about employment, credit, housing or insurance where consumer-reporting laws apply;</li>
        <li>try to get around rate limits, run several accounts to raise your limits, or resell access;</li>
        <li>attack, overload or scrape the service or the sources it queries.</li>
      </ul>
      <h2>Results</h2>
      <p>Results come from third-party public sources at the moment you search. They can be wrong, out of date or incomplete. A match is a lead, not proof of identity. You are responsible for verifying anything before relying on it.</p>
      <h2>Accounts</h2>
      <p>We may suspend accounts that break these terms. You can delete your account at any time, which deletes your history, cases and API keys.</p>
      <h2>No warranty</h2>
      <p>The service is provided free and “as is”, without warranties of any kind. To the extent the law allows, we are not liable for any loss arising from its use.</p>
    </Prose>
  );
}
