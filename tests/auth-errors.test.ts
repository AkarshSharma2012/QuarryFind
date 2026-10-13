import { describe, expect, it } from "vitest";
import { signInMessage } from "../web/src/lib/data/auth-errors.ts";

describe("sign-in error messages (BUG-001)", () => {
  it("rate limiting is not reported as a wrong password", () => {
    expect(signInMessage({ status: 429, message: "Request rate limit reached" })).toMatch(/Too many tries/);
    expect(signInMessage({ code: "over_request_rate_limit" })).toMatch(/Too many/);
  });
  it("wrong credentials", () => {
    expect(signInMessage({ status: 400, code: "invalid_credentials", message: "Invalid login credentials" })).toBe("That’s not the password.");
  });
  it("unconfirmed email", () => {
    expect(signInMessage({ status: 400, code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/Confirm your email/);
  });
  it("server trouble is not blamed on the user", () => {
    expect(signInMessage({ status: 500, message: "boom" })).toMatch(/isn’t working right now/);
  });
});
