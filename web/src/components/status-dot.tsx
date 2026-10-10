"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Footer status from the public API health endpoint. Hidden when there's no backend. */
export function StatusDot() {
  const [state, setState] = useState<"ok" | "degraded" | "down" | null>(null);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_BACKEND !== "supabase" || !URL_) return;
    const ctl = new AbortController();
    fetch(`${URL_}/functions/v1/v1/health`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => setState(d.status === "ok" ? "ok" : "degraded"))
      .catch(() => { if (!ctl.signal.aborted) setState("down"); });
    return () => ctl.abort();
  }, []);
  if (!state) return null;
  const label = { ok: "All systems normal", degraded: "Some systems degraded", down: "Service unreachable" }[state];
  return (
    <p className="inline-flex items-center gap-2 text-xs text-text-subtle" role="status">
      <span className={clsx("size-2 rounded-full", state === "ok" ? "bg-success" : state === "degraded" ? "bg-warning" : "bg-danger")} aria-hidden />
      {label}
    </p>
  );
}
