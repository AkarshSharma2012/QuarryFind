"use client";

import { useMemo, useState } from "react";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { ToolShell, RecordsTable } from "@/components/tool-layout";
import { Card, EmptyState, Input } from "@/components/ui/primitives";

const TYPES: Record<string, string> = {
  MOBILE: "Mobile", FIXED_LINE: "Landline", FIXED_LINE_OR_MOBILE: "Landline or mobile", TOLL_FREE: "Toll-free", PREMIUM_RATE: "Premium rate",
  SHARED_COST: "Shared cost", VOIP: "VoIP", PERSONAL_NUMBER: "Personal number", PAGER: "Pager", UAN: "Universal access", VOICEMAIL: "Voicemail",
};

export default function PhoneTool() {
  const [q, setQ] = useState("");
  const [cc, setCc] = useState("");
  const region = useMemo(() => new Intl.DisplayNames(undefined, { type: "region" }), []);
  const p = q.trim() ? parsePhoneNumberFromString(q, (cc.toUpperCase() || undefined) as CountryCode | undefined) : undefined;

  return (
    <ToolShell slug="phone">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Input label="Phone number" inputSize="lg" placeholder="+44 20 7946 0958" value={q} onChange={(e) => setQ(e.target.value)} inputMode="tel" maxLength={40} hint="Parsed in your browser with the libphonenumber rules. Nothing is sent." />
        <Input label="Default country" inputSize="lg" placeholder="US" value={cc} onChange={(e) => setCc(e.target.value.slice(0, 2))} hint="If no +code." />
      </div>
      {q.trim() && !p && <Card><EmptyState title="Can’t read that number" body="Add the country code (for example +1 or +44), or set a default country." /></Card>}
      {p && (
        <RecordsTable records={[
          { name: "Valid", value: p.isValid() ? "yes" : p.isPossible() ? "possible, but not a valid range" : "no" },
          { name: "Country", value: p.country ? `${region.of(p.country) ?? p.country} (${p.country})` : "unknown / non-geographic" },
          { name: "Country code", value: `+${p.countryCallingCode}` },
          { name: "Line type", value: TYPES[p.getType() ?? ""] ?? "unknown" },
          { name: "International", value: p.formatInternational() },
          { name: "National", value: p.formatNational() },
          { name: "E.164", value: p.number },
          { name: "Link", value: p.getURI() },
        ]} />
      )}
      <p className="text-xs text-text-subtle">This tool reads the number’s structure only: country and range type. It does not look up who owns a number.</p>
    </ToolShell>
  );
}
