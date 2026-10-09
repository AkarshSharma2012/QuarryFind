import { describe, expect, it } from "vitest";
import { analyzeHeaders, dorks, identifyHash, variations, digest } from "../web/src/lib/client-tools.ts";
import { resultsCsv } from "../web/src/lib/export.ts";

describe("variations", () => {
  it("builds name permutations", () => {
    const v = variations("Jane Doe");
    expect(v).toContain("janedoe");
    expect(v).toContain("jane.doe");
    expect(v).toContain("jdoe");
    expect(v).toContain("doe_jane");
    expect(v.every((x) => /^[a-z0-9._-]+$/.test(x))).toBe(true);
  });
  it("strips accents and handles a single handle", () => {
    expect(variations("José")).toContain("jose");
    expect(variations("")).toEqual([]);
  });
});

describe("dorks", () => {
  it("quotes the target and strips embedded quotes", () => {
    expect(dorks("person", 'Jane "x" Doe')[0].query).toBe('"Jane x Doe"');
    expect(dorks("domain", "example.com")[0].query).toBe("site:example.com");
    expect(dorks("email", "a@b.com").some((d) => d.query.includes('"@b.com"'))).toBe(true);
  });
});

describe("hashes", () => {
  it("identifies common formats", () => {
    expect(identifyHash("5f4dcc3b5aa765d61d8327deb882cf99")).toContain("MD5");
    expect(identifyHash("$2b$12$abcdefghijklmnopqrstuv")).toEqual(["bcrypt"]);
    expect(identifyHash("not a hash!")).toEqual([]);
  });
  it("computes SHA-1", async () => {
    expect(await digest("SHA-1", "password")).toBe("5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8");
  });
});

describe("email headers", () => {
  const raw = [
    "Received: from mail.attacker.test (mail.attacker.test [203.0.113.9]) by mx.example.com with ESMTPS; Thu, 1 Oct 2026 10:00:05 +0000",
    "Received: from laptop (unknown [192.168.1.4]) by mail.attacker.test with ESMTP; Thu, 1 Oct 2026 10:00:00 +0000",
    "Authentication-Results: mx.example.com; spf=fail smtp.mailfrom=attacker.test; dkim=none; dmarc=fail",
    "From: Bank <alerts@bank.test>",
    "Reply-To: <help@attacker.test>",
    "Subject: Verify your",
    " account now",
    "",
    "body",
  ].join("\n");
  it("unfolds, orders hops oldest first and flags problems", () => {
    const r = analyzeHeaders(raw);
    expect(r.subject).toBe("Verify your account now");
    expect(r.hops[0].by).toBe("mail.attacker.test");
    expect(r.hops[1].delay).toBe(5);
    expect(r.ips).toEqual(["203.0.113.9"]);
    expect(r.auth).toContainEqual({ name: "SPF", value: "fail" });
    expect(r.warnings.some((w) => w.includes("Reply-To"))).toBe(true);
  });
});

describe("csv export", () => {
  it("neutralises formulas", () => {
    const csv = resultsCsv(
      { id: "r", type: "username", query: "x", deep: false, via: "web", status: "completed", modules_total: 1, modules_completed: 1, modules_with_hits: 1, modules_failed: 0, results_purged_at: null, created_at: "", completed_at: null },
      [{ run_id: "r", seq: 1, type: "account", platform: "=HYPERLINK(1)", category: null, value: "v", confidence: 1, source: "s", metadata: {}, created_at: "" }],
    );
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
  });
});
