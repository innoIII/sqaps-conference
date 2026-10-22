"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Check,
  AlertCircle,
  Phone,
  MapPin,
} from "lucide-react";

interface WhatsAppModalProps {
  /** When open, shows the modal; null = closed. Pass a phone number to open. */
  phone: string | null;
  onClose: () => void;
}

/**
 * Contact popup — visitor composes a message and the site forwards it as a
 * WhatsApp notification to the support team via CallMeBot.
 *
 * The visitor never gets a reply (one-way notification). On send, the message
 * goes to /api/contact/whatsapp which calls CallMeBot → the support team
 * receives a WhatsApp alert instantly.
 *
 * Works on any device (iPad without WhatsApp, desktop, mobile) because the
 * sending happens server-side via the CallMeBot API.
 */
export function WhatsAppModal({ phone, onClose }: WhatsAppModalProps) {
  // Which hall needs help — required, so the support team knows where to go.
  const [hall, setHall] = useState("");
  const [halls, setHalls] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
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

  // Halls from the hall guide (same names as on the map and the session pages).
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/map-config")
      .then((r) => r.json())
      .then((d) => active && setHalls((d.halls ?? []).map((h: { ar: string }) => h.ar)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  // Reset state when modal opens for a new number.
  useEffect(() => {
    if (open) {
      setHall("");
      setMessage("");
      setStatus("idle");
    }
  }, [open, phone]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !hall) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          hall,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }, [message, hall]);

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
          aria-label="إرسال رسالة تواصل"
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
                    تواصل مع الدعم الفني
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
              {status === "sent" ? (
                /* Success state */
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                    <Check className="h-8 w-8 text-[#25D366]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-base font-bold text-[#0B1B3D]" dir="rtl">
                      تم إرسال رسالتك
                    </p>
                    <p
                      className="mt-1 max-w-xs text-sm text-[#6B7280]"
                      dir="rtl"
                    >
                      وصل إشعار رسالتك إلى فريق الدعم الفني. سيتم الرد عليك في
                      أقرب وقت.
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
                  {/* Hall (required) — tells the support team where to go */}
                  <div>
                    <label
                      htmlFor="wa-hall"
                      className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#0B1B3D]"
                      dir="rtl"
                    >
                      <MapPin className="h-3 w-3 text-[#25D366]" aria-hidden />
                      القاعة <span className="text-[#B91C1C]">*</span>
                    </label>
                    <select
                      id="wa-hall"
                      required
                      value={hall}
                      onChange={(e) => setHall(e.target.value)}
                      dir="rtl"
                      className={`h-11 w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-4 text-sm transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 ${hall ? "text-[#0B1B3D]" : "text-[#9CA3AF]"}`}
                    >
                      <option value="" disabled>
                        اختر القاعة التي تحتاج الدعم فيها
                      </option>
                      {halls.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                      <option value="مكان آخر في المبنى">مكان آخر في المبنى</option>
                    </select>
                  </div>

                  {/* Message */}
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
                      placeholder="اكتب رسالتك هنا..."
                      dir="rtl"
                      className="scroll-elegant w-full rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] p-4 text-sm leading-relaxed text-[#0B1B3D] transition-colors placeholder:text-[#9CA3AF] focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
                      autoFocus
                    />
                  </div>

                  {/* Error message */}
                  {status === "error" && (
                    <p
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C]"
                      dir="rtl"
                    >
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                      تعذر الإرسال. حاول مرة أخرى.
                    </p>
                  )}

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
                      disabled={status === "sending" || !message.trim() || !hall}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#25D366] to-[#128C7E] px-4 text-sm font-bold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                      dir="rtl"
                    >
                      {status === "sending" ? (
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
