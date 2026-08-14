"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { logPolicyShareAttemptAction } from "./actions";

/**
 * Opens the agent's own WhatsApp with the policy pre-filled, rather than
 * sending automatically — there's no WhatsApp Business API configured in
 * this environment. Mirrors quotations/[id]/WhatsAppShare.tsx: wa.me can't
 * attach a file, so the PDF still has to be attached by hand after
 * downloading it above.
 */
export function WhatsAppShare({
  policyId,
  referenceCode,
  entityName,
  planLabel,
  totalPremium,
  defaultPhone,
}: {
  policyId: string;
  referenceCode: string;
  entityName: string;
  planLabel: string;
  totalPremium: string;
  defaultPhone: string;
}) {
  const [phone, setPhone] = useState(defaultPhone);

  function shareWhatsApp() {
    const verifyUrl = `${window.location.origin}/verify/${referenceCode}`;
    const message = [
      `Dignity Last Expense Policy ${referenceCode}`,
      "",
      entityName,
      planLabel,
      `Total Annual Premium: ${totalPremium}`,
      "",
      `View / verify: ${verifyUrl}`,
      "",
      "The policy certificate (PDF) is attached separately.",
      "— Imoth Insurance Brokers Ltd",
    ].join("\n");
    const text = encodeURIComponent(message);
    const digits = phone.replace(/[^\d]/g, "");
    const url = digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    logPolicyShareAttemptAction(policyId, "WHATSAPP", phone.trim()).catch((err) => console.error("Failed to log share attempt:", err));
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-imoth-grey-border p-3">
      <p className="text-xs font-semibold text-imoth-navy">Share via WhatsApp</p>
      <label className="block text-xs font-medium text-imoth-navy">
        Phone (optional — leave blank to pick a contact)
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 0712345678"
          className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={shareWhatsApp}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-imoth-grey-border bg-white px-4 py-2.5 text-sm font-semibold text-imoth-navy hover:bg-imoth-grey-bg"
      >
        <MessageCircle className="h-4 w-4" /> Share via WhatsApp
      </button>
      <p className="text-[11px] leading-snug text-imoth-grey-muted">
        Opens your own WhatsApp with the message pre-filled — download the PDF above and attach it by hand,
        since this link can&apos;t attach a file automatically.
      </p>
    </div>
  );
}
