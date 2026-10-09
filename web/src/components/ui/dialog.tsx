"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native <dialog> + showModal(): focus trap, Esc and inert background come from the browser. */
export function Dialog({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(92vw,28rem)] rounded-lg border border-border bg-surface p-0 text-text shadow-pop backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id={titleId} className="text-base font-medium">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-sm p-1 text-text-muted hover:text-text">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="px-5 py-4 text-sm text-text-muted">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
    </dialog>
  );
}
