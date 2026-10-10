/** Turns a Supabase Auth error into a message a person can act on. */
export function signInMessage(e: { status?: number; code?: string; message?: string }): string {
  const msg = (e.message ?? "").toLowerCase();
  if (e.status === 429 || e.code === "over_request_rate_limit" || msg.includes("rate limit")) {
    return "Too many sign-in attempts. Wait a few minutes and try again.";
  }
  if (e.code === "email_not_confirmed" || msg.includes("confirm")) return "Confirm your email first; check your inbox.";
  if (e.status === 400 || e.code === "invalid_credentials") return "Email or password is wrong.";
  return "Sign-in isn’t working right now. Try again in a moment.";
}
