"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Check,
  ExternalLink,
  Phone,
} from "lucide-react";

interface WhatsAppModalProps {
  /** When open, shows the modal; null = closed. Pass a phone number to open. */
  phone: string | null;
  onClose: () => void;
}

/**
 * WhatsApp message popup.
 *
 * When the user clicks a phone number, this modal opens with a textarea to
 * compose a message. On send, it opens WhatsApp (wa.me) with the message
 * pre-filled — the user confirms in WhatsApp and the message is delivered.
 *
 * No backend required: uses the official wa.me deep link which works on
 * mobile (opens the WhatsApp app) and desktop (opens WhatsApp Web).
 *
 * Note: for fully automated sending without the user confirming in WhatsApp,
 * you'd need the WhatsApp Business API + a backend chatbot agent. This
 * implementation uses the deep-link approach which is reliable and needs no
 * credentials.
 */
export function WhatsAppModal({ phone, onClose }: WhatsAppModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const open = phone !== null;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.classList.remove("modal-open");
    };
  }, [open, handleKey]);

  // Reset state when modal opens for a new number.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage("");
      setSent(false);
      setSending(false);
    }
  }, [open, phone]);

  /** Build the wa.me deep link with the message pre-filled. */
  const buildWhatsAppUrl = useCallback(
    (msg: string) => {
      // wa.me requires international format without + or spaces.
      // The configured numbers are local Oman numbers (8 digits) → add Oman
      // country code 968. If the number already starts with a country code,
      // leave it as-is.
      const raw = (phone ?? "").replace(/[^0-9]/g, "");
      const international = raw.length === 8 ? `968${raw}` : raw;
      const text = msg.trim() || "مرحباً، لدي استفسار بخصوص المؤتمر العلمي الدولي الثالث";
      return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
    },
    [phone],
  );

  const handleSend = useCallback(() => {
    setSending(true);
    // Open WhatsApp in a new tab with the pre-filled message.
    const url = buildWhatsAppUrl(message);
    window.open(url, "_blank", "noopener,noreferrer");
    // Simulate a brief "sending" state for UX feedback.
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 800);
  }, [message, buildWhatsAppUrl]);

  const displayPhone = phone ?? "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="إرسال رسالة واتساب"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#07152F]/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between gap-3 bg-gradient-to-l from-[#25D366] to-[#128C7E] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <MessageCircle className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold" dir="rtl">
                    إرسال رسالة واتساب
                  </h3>
                  <p
                    className="flex items-center gap-1 text-xs text-white/85"
                    dir="ltr"
                  >
                    <Phone className="h-3 w-3" aria-hidden />
                    +968 {displayPhone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {sent ? (
                /* Success state */
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                    <Check className="h-8 w-8 text-[#25D366]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-base font-bold text-[#0B1B3D]" dir="rtl">
                      تم فتح واتساب
                    </p>
                    <p
                      className="mt-1 max-w-xs text-sm text-[#6B7280]"
                      dir="rtl"
                    >
                      راجع الرسالة في واتساب واضغط إرسال لتأكيد إيصالها إلى رقم
                      المؤتمر.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-[#0B1B3D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#07152F]"
                    dir="rtl"
                  >
                    تم
                  </button>
                </div>
              ) : (
                /* Compose state */
                <>
                  <div>
                    <label
                      htmlFor="wa-message"
                      className="mb-1.5 block text-xs font-semibold text-[#0B1B3D]"
                      dir="rtl"
                    >
                      رسالتك
                    </label>
                    <textarea
                      id="wa-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder="اكتب رسالتك هنا... (مثلاً: مرحباً، لدي استفسار بخصوص المؤتمر)"
                      dir="rtl"
                      className="scroll-elegant w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4 text-sm leading-relaxed text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
                      autoFocus
                    />
                  </div>

                  <p
                    className="flex items-start gap-1.5 text-[11px] text-[#9CA3AF]"
                    dir="rtl"
                  >
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    سيتم فتح واتساب برسالتك جاهزة — اضغط إرسال داخل واتساب للتأكيد
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E2E5EC] bg-white px-4 text-sm font-bold text-[#6B7280] transition-colors hover:bg-[#F5F6F8]"
                      dir="rtl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#25D366] to-[#128C7E] px-4 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                      dir="rtl"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden />
                      )}
                      إرسال
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
