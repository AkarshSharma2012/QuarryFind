import { describe, expect, it } from "vitest";
import { safeHref } from "../web/src/lib/safe-href.ts";

describe("safeHref", () => {
  it("keeps absolute http(s) links", () => {
    expect(safeHref("https://github.com/torvalds")).toBe("https://github.com/torvalds");
    expect(safeHref(" http://example.com/a?b=1 ")).toBe("http://example.com/a?b=1");
  });
  it("drops scripts, data, relative and malformed values", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>", "//evil.example", "/settings", "https://", "", null, 42, undefined]) {
      expect(safeHref(bad), String(bad)).toBeUndefined();
    }
  });
});
