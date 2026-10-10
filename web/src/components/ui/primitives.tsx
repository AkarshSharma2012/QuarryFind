"use client";

import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

/* ── Badge ─────────────────────────────────────────────────────────────── */
type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "outline";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-text-muted",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  outline: "border border-border text-text-muted",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex h-5 items-center gap-1 rounded-pill px-2 text-xs", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────── */
export function Card({ className, raised, interactive, ...rest }: ComponentProps<"div"> & { raised?: boolean; interactive?: boolean }) {
  return (
    <div
      className={clsx(
        "relative rounded-lg border border-border shadow-card",
        raised ? "bg-surface-2" : "bg-surface",
        interactive && "transition-colors hover:border-border-input",
        className,
      )}
      {...rest}
    />
  );
}

/* ── Input ─────────────────────────────────────────────────────────────── */
type InputProps = ComponentProps<"input"> & {
  label: string;
  hideLabel?: boolean;
  prefix?: string;
  error?: string;
  hint?: string;
  inputSize?: "md" | "lg";
  trailing?: ReactNode;
};
export function Input({ label, hideLabel, prefix, error, hint, inputSize = "md", trailing, className, id, ...rest }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const msgId = `${inputId}-msg`;
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className={clsx("text-sm text-text-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      <div
        className={clsx(
          "flex items-center rounded-md border bg-surface transition-colors focus-within:border-focus focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus has-[button:focus-visible]:outline-none",
          error ? "border-danger" : "border-border-input",
          inputSize === "lg" ? "h-13 pl-4 pr-1.5 text-base" : "h-10 px-3 text-sm",
        )}
      >
        {prefix && <span className="mr-1 font-mono text-text-subtle" aria-hidden>{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-text placeholder:text-text-subtle focus-visible:outline-none"
          {...rest}
        />
        {trailing}
      </div>
      {(error || hint) && (
        <p id={msgId} className={clsx("text-xs", error ? "text-danger" : "text-text-subtle")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/* ── SegmentedControl (radiogroup) ─────────────────────────────────────── */
export function SegmentedControl<T extends string>({
  label, options, value, onChange,
}: { label: string; options: { value: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  const move = (dir: number) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => document.getElementById(`seg-${next.value}`)?.focus());
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border border-border bg-surface p-1"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            id={`seg-${o.value}`}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={clsx(
              "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm transition-colors",
              on ? "bg-surface-2 text-text shadow-card" : "text-text-muted hover:text-text",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Switch ────────────────────────────────────────────────────────────── */
export function Switch({ label, checked, onChange, disabled, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        aria-describedby={description ? `${id}-d` : undefined}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-pill border transition-colors disabled:opacity-50",
          // 44px touch area without changing the visual size.
          "before:absolute before:-inset-3 before:content-['']",
          checked ? "border-accent bg-accent" : "border-border-input bg-surface-2",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 size-3.5 rounded-pill transition-transform",
            checked ? "translate-x-4.5 bg-on-accent" : "translate-x-0.5 bg-text-muted",
          )}
        />
      </button>
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm text-text">{label}</label>
        {description && <span id={`${id}-d`} className="text-xs text-text-subtle">{description}</span>}
      </div>
    </div>
  );
}

/* ── StatTile ──────────────────────────────────────────────────────────── */
export function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg text-text tabular-nums">{value}</span>
      <span className="text-xs text-text-subtle">{label}</span>
    </div>
  );
}

/* ── ProgressBar ───────────────────────────────────────────────────────── */
export function ProgressBar({ value, max, label, tone = "accent" }: { value: number; max: number; label: string; tone?: "accent" | "success" | "warning" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-2">
      <div
        className={clsx("h-full rounded-pill transition-[width] duration-[var(--motion-base)]", { accent: "bg-accent", success: "bg-success", warning: "bg-warning" }[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── CodeBlock ─────────────────────────────────────────────────────────── */
export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface-2">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-text-subtle">{lang}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
          onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${lang ?? "Code"} example`} className="overflow-x-auto p-3 font-mono text-xs leading-5 text-text"><code>{code}</code></pre>
    </div>
  );
}

/* ── EmptyState ────────────────────────────────────────────────────────── */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-text-subtle" aria-hidden>{icon}</div>}
      <h3 className="text-base font-medium text-text">{title}</h3>
      {body && <p className="max-w-sm text-sm text-text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-surface-2", className)} aria-hidden />;
}
