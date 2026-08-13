"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { VARIANT_CLASS } from "./Button";

/**
 * Wraps a real server action in a confirm-before-submit modal. `action` is a
 * server action already bound to its arguments (e.g. via .bind(null, id)) —
 * this component never changes what gets submitted, only when.
 */
export function ConfirmSubmitButton({
  action,
  label,
  confirmTitle,
  confirmMessage,
  variant = "primary",
  requireReason = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  variant?: "primary" | "danger" | "secondary";
  requireReason?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={VARIANT_CLASS[variant]}>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={confirmTitle}>
        <form action={action}>
          <p className="text-sm text-imoth-grey-muted">{confirmMessage}</p>
          {requireReason && (
            <label className="mt-4 block text-sm font-medium text-imoth-navy">
              Reason (required)
              <textarea
                name="reason"
                required
                rows={2}
                className="mt-1 w-full rounded-md border border-imoth-grey-border px-3 py-2 text-sm"
              />
            </label>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className={VARIANT_CLASS.secondary}>
              Cancel
            </button>
            <button type="submit" className={VARIANT_CLASS[variant]}>
              {label}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
