"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  Loader2,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  MessageSquare,
  User,
  CheckCircle2,
  FileText,
  Lightbulb,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentResponse {
  reply: string;
  suggestedReport?: string;
  suggestedQuestion?: string;
  provider?: string;
  model?: string;
}

interface AiAgentChatProps {
  /** The track id to provide as context. */
  trackId: number;
  /** "report" for chair (admin), "question" for audience (/qn). */
  mode: "report" | "question";
  /** The current report text (report mode) — used as context. */
  currentReport?: string;
  /** Called when the user accepts a suggested report. */
  onApplyReport?: (report: string) => void;
  /** Called when the user accepts a suggested question. */
  onApplyQuestion?: (question: string) => void;
}

/**
 * AI Agent Chat — an interactive conversational panel where the user
 * (chair or audience) talks with the AI agent ("المفكّر") to refine
 * a report or a question.
 *
 * Features:
 *   - Multi-turn conversation history (last 20 messages sent to the API).
 *   - Quick-action buttons (mode-specific).
 *   - When the agent suggests a full report/question, an "Apply" button
 *     appears to accept it.
 *   - Provider + model badge on each AI reply (transparency).
 *   - Auto-scroll to the latest message.
 *   - Loading + error states.
 */
export function AiAgentChat({
  trackId,
  mode,
  currentReport,
  onApplyReport,
  onApplyQuestion,
}: AiAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReport, setPendingReport] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            trackId,
            mode,
            currentReport: mode === "report" ? currentReport : undefined,
          }),
        });

        const data = (await res.json()) as AgentResponse & { error?: string };

        if (!res.ok) {
          throw new Error(data.error || "فشل الاتصال بالوكيل");
        }

        const aiMsg: ChatMessage = {
          role: "assistant",
          content: data.reply,
        };
        setMessages([...newMessages, aiMsg]);
        setLastProvider(data.provider || null);

        // Store suggestions for the "Apply" button.
        if (data.suggestedReport) setPendingReport(data.suggestedReport);
        if (data.suggestedQuestion) setPendingQuestion(data.suggestedQuestion);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطأ غير معروف");
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, trackId, mode, currentReport],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      send(input);
    },
    [send, input],
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setError(null);
    setPendingReport(null);
    setPendingQuestion(null);
    setInput("");
  }, []);

  const handleApplyReport = useCallback(() => {
    if (pendingReport && onApplyReport) {
      onApplyReport(pendingReport);
      setPendingReport(null);
    }
  }, [pendingReport, onApplyReport]);

  const handleApplyQuestion = useCallback(() => {
    if (pendingQuestion && onApplyQuestion) {
      onApplyQuestion(pendingQuestion);
      setPendingQuestion(null);
    }
  }, [pendingQuestion, onApplyQuestion]);

  // Quick actions (mode-specific).
  const quickActions =
    mode === "report"
      ? [
          {
            label: "أعد صياغة التقرير",
            icon: RefreshCw,
            prompt: "أعد صياغة التقرير الحالي بأسلوب علمي أكثر رصانة.",
          },
          {
            label: "أضف تفاصيل",
            icon: FileText,
            prompt: "أضف تفاصيل أكثر لتحليل الأوراق البحثية في التقرير.",
          },
          {
            label: "لخّص التوصيات",
            icon: Lightbulb,
            prompt: "لخّص التوصيات في نقاط واضحة ومحددة.",
          },
        ]
      : [
          {
            label: "وضّح السؤال",
            icon: Lightbulb,
            prompt: "ساعدني في توضيح سؤالي ليكون أكثر دقة.",
          },
          {
            label: "اجعله علمياً",
            icon: Sparkles,
            prompt: "أعد صياغة سؤالي بأسلوب علمي دقيق.",
          },
        ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E5EC] bg-white shadow-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E2E5EC] bg-gradient-to-l from-[#0B1B3D] to-[#07152F] px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B3D] shadow-md"
          >
            <Brain className="h-5 w-5" aria-hidden />
          </motion.span>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold" dir="rtl">
              المفكّر — الوكيل الذكي
              {lastProvider && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-[#D4AF37]">
                  {lastProvider}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-white/60" dir="rtl">
              {mode === "report"
                ? "يساعدك في صياغة وتعديل التقرير"
                : "يساعدك في صياغة سؤالك"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          aria-label="محادثة جديدة"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {/* Messages — scrollable */}
      <div
        ref={scrollRef}
        className="scroll-elegant min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F5F6F8] p-4"
      >
        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4ECD0]">
              <Brain className="h-7 w-7 text-[#D4AF37]" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
                مرحباً، أنا المفكّر
              </p>
              <p className="mt-1 text-xs text-[#6B7280]" dir="rtl">
                {mode === "report"
                  ? "اكتب لي ما تريد تعديله في التقرير، أو اختر من الاقتراحات"
                  : "اكتب لي فكرتك، وسأساعدك في صياغتها بشكل احترافي"}
              </p>
            </div>
          </div>
        )}

        {/* Message list */}
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={[
                "flex gap-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row",
              ].join(" ")}
            >
              {/* Avatar */}
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-[#0B1B3D] to-[#1E3A5F]"
                    : "bg-gradient-to-br from-[#D4AF37] to-[#B8941F] text-[#0B1B3D]",
                ].join(" ")}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Brain className="h-3.5 w-3.5" aria-hidden />
                )}
              </span>

              {/* Bubble */}
              <div
                className={[
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-tr-sm bg-[#0B1B3D] text-white"
                    : "rounded-tl-sm bg-white text-[#0B1B3D] shadow-sm ring-1 ring-[#E2E5EC]",
                ].join(" ")}
                dir="rtl"
              >
                {/* Render the reply — strip the markers for display */}
                {msg.role === "assistant"
                  ? msg.content
                      .replace(/\[تقرير محدّث\]\s*/g, "")
                      .replace(/\[تعديل قسم:[^\]]+\]\s*/g, "")
                      .replace(/\[سؤال جاهز\]\s*/g, "")
                  : msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8941F] text-[#0B1B3D] shadow-sm">
              <Brain className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-[#E2E5EC]">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#D4AF37] [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#D4AF37] [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#D4AF37]" />
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#B91C1C]" dir="rtl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Suggested report — Apply button */}
        {pendingReport && onApplyReport && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#D4AF37]/40 bg-[#F4ECD0]/60 p-3"
          >
            <p
              className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]"
              dir="rtl"
            >
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" aria-hidden />
              تقرير محدّث جاهز
            </p>
            <div className="mb-2 max-h-32 overflow-y-auto rounded-lg bg-white p-2 text-xs text-[#0B1B3D]" dir="rtl">
              {pendingReport.slice(0, 300)}
              {pendingReport.length > 300 ? "..." : ""}
            </div>
            <button
              type="button"
              onClick={handleApplyReport}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0B1B3D] text-xs font-bold text-white transition-colors hover:bg-[#07152F]"
              dir="rtl"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              تطبيق على التقرير
            </button>
          </motion.div>
        )}

        {/* Suggested question — Apply button */}
        {pendingQuestion && onApplyQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#D4AF37]/40 bg-[#F4ECD0]/60 p-3"
          >
            <p
              className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#0B1B3D]"
              dir="rtl"
            >
              <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" aria-hidden />
              سؤال جاهز للإرسال
            </p>
            <div className="mb-2 rounded-lg bg-white p-2 text-xs text-[#0B1B3D]" dir="rtl">
              {pendingQuestion}
            </div>
            <button
              type="button"
              onClick={handleApplyQuestion}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0B1B3D] text-xs font-bold text-white transition-colors hover:bg-[#07152F]"
              dir="rtl"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              استخدام هذا السؤال
            </button>
          </motion.div>
        )}
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="shrink-0 border-t border-[#E2E5EC] bg-white p-3">
          <p className="mb-2 text-[10px] font-bold text-[#9CA3AF]" dir="rtl">
            اقتراحات سريعة
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => send(action.prompt)}
                disabled={loading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E2E5EC] bg-white px-2.5 text-[11px] font-bold text-[#0B1B3D] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#F4ECD0]/40 disabled:opacity-50"
                dir="rtl"
              >
                <action.icon className="h-3 w-3 text-[#D4AF37]" aria-hidden />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[#E2E5EC] bg-white p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={
              mode === "report"
                ? "اكتب تعليماتك للوكيل..."
                : "اكتب فكرتك أو سؤالك..."
            }
            dir="rtl"
            rows={1}
            disabled={loading}
            className="scroll-elegant max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-2 text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="إرسال"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B1B3D] text-[#D4AF37] transition-colors hover:bg-[#07152F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
