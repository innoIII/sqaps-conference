"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  User,
  CheckCircle2,
  FileText,
  Lightbulb,
  AlignRight,
  ClipboardCheck,
  History,
  Trash2,
  MessageSquare,
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
  /** Which paper slot is selected (report mode) — for generate-report. */
  paperSlot?: number;
  /** Notes/content to pass to generate-report. */
  notes?: string;
  /** Called when the user accepts a suggested report. */
  onApplyReport?: (report: string) => void;
  /** Called when the user accepts a suggested question. */
  onApplyQuestion?: (question: string) => void;
}

/** A saved conversation (for the history feature). */
interface SavedConversation {
  id: string;
  trackId: number;
  mode: string;
  paperSlot?: number;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** localStorage key for saved conversations. */
const CONV_STORAGE_KEY = "sqaps-thinker-conversations";

/** Load saved conversations from localStorage. */
function loadConversations(): SavedConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CONV_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SavedConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save conversations to localStorage. */
function persistConversations(convs: SavedConversation[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep only the last 20 conversations to avoid bloating localStorage.
    const trimmed = convs.slice(0, 20);
    window.localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

/** Generate a short title from the first user message. */
function makeTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "محادثة جديدة";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 40 ? text.slice(0, 40) + "…" : text;
}

/**
 * AI Agent Chat — an interactive conversational panel where the user
 * (chair or audience) talks with the AI agent ("المفكّر") to refine
 * a report or a question.
 *
 * In "report" mode, 5 quick-action features are always available inside
 * the chat (generate report, summarize, format, extract recommendations,
 * evaluate papers) so the chair has everything in one place.
 */
export function AiAgentChat({
  trackId,
  mode,
  currentReport,
  paperSlot,
  notes,
  onApplyReport,
  onApplyQuestion,
}: AiAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReport, setPendingReport] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Conversation history state ──
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);

  // Load saved conversations on mount.
  useEffect(() => {
    setSavedConversations(loadConversations());
  }, []);

  // Auto-save the current conversation whenever messages change.
  useEffect(() => {
    if (messages.length === 0) return;
    const now = Date.now();
    setSavedConversations((prev) => {
      let updated: SavedConversation[];
      if (currentConvId) {
        // Update existing conversation.
        updated = prev.map((c) =>
          c.id === currentConvId
            ? { ...c, messages, title: makeTitle(messages), updatedAt: now }
            : c,
        );
      } else {
        // Create new conversation.
        const newConv: SavedConversation = {
          id: `conv-${now}-${Math.random().toString(36).slice(2, 8)}`,
          trackId,
          mode,
          paperSlot,
          title: makeTitle(messages),
          messages,
          createdAt: now,
          updatedAt: now,
        };
        setCurrentConvId(newConv.id);
        updated = [newConv, ...prev];
      }
      persistConversations(updated);
      return updated;
    });
  }, [messages, currentConvId, trackId, mode, paperSlot]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading, generatingReport]);

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
            paperSlot,
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
    [messages, loading, trackId, mode, currentReport, paperSlot],
  );

  // ── Generate full report (calls the dedicated /api/ai/generate-report) ──
  // This is one of the 5 features inside the thinker. It produces a
  // complete report from the PDFs, shown as a pendingReport with an
  // "Apply" button — so the chair reviews it before replacing the editor.
  const handleGenerateReport = useCallback(async () => {
    if (generatingReport || loading) return;

    // Show a user message so the chair sees what was requested.
    const userMsg: ChatMessage = {
      role: "user",
      content: paperSlot
        ? `ولّد تقريراً شاملاً للورقة ${paperSlot} من ملف PDF.`
        : "ولّد تقريراً شاملاً للمحور من ملفات PDF للأوراق البحثية.",
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setGeneratingReport(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId,
          notes: notes ?? currentReport ?? "",
          paperSlot: paperSlot && paperSlot > 0 ? paperSlot : undefined,
        }),
      });

      const data = (await res.json()) as {
        report?: string;
        provider?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "فشل توليد التقرير");
      }

      if (data.report) {
        setPendingReport(data.report);
        setLastProvider(data.provider || null);
        const aiMsg: ChatMessage = {
          role: "assistant",
          content:
            "تم توليد التقرير الشامل من ملفات الأوراق البحثية والسير الذاتية. راجع المعاينة أدناه ثم اضغط «تطبيق على التقرير» لاستخدامه في المحرر، أو تابع المحادثة لطلب تعديلات.",
        };
        setMessages([...newMessages, aiMsg]);
      }
    } catch (e) {
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: `تعذّر توليد التقرير: ${e instanceof Error ? e.message : "خطأ غير معروف"}. حاول مرة أخرى.`,
      };
      setMessages([...newMessages, aiMsg]);
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setGeneratingReport(false);
    }
  }, [generatingReport, loading, messages, trackId, notes, currentReport, paperSlot]);

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
    setCurrentConvId(null); // Start a fresh conversation.
    setShowHistory(false);
  }, []);

  // Load a saved conversation into the chat.
  const handleLoadConversation = useCallback((conv: SavedConversation) => {
    setMessages(conv.messages);
    setCurrentConvId(conv.id);
    setShowHistory(false);
    setError(null);
    setPendingReport(null);
    setPendingQuestion(null);
  }, []);

  // Delete a saved conversation.
  const handleDeleteConversation = useCallback(
    (id: string) => {
      setSavedConversations((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        persistConversations(updated);
        return updated;
      });
      // If we deleted the current conversation, reset.
      if (currentConvId === id) {
        setMessages([]);
        setCurrentConvId(null);
      }
    },
    [currentConvId],
  );

  // ── Proactive suggestions ──
  // Generate smart suggestions based on the current report content.
  // Shown when the chat is empty (before the user starts typing).
  const proactiveSuggestions = useMemo(() => {
    if (mode !== "report") return [];
    const report = (currentReport ?? "").trim();
    const suggestions: { icon: typeof Sparkles; text: string; prompt: string }[] = [];

    // If report is empty → suggest generating.
    if (report.length === 0) {
      suggestions.push({
        icon: Sparkles,
        text: "ابدأ بتوليد تقرير شامل من ملفات PDF",
        prompt: "ولّد تقريراً شاملاً للمحور من ملفات الأوراق البحثية والسير الذاتية.",
      });
      return suggestions;
    }

    // Check what's missing from the report.
    const lower = report.toLowerCase();

    // Missing recommendations section?
    if (
      !lower.includes("توصيات") &&
      !lower.includes("توصية") &&
      !lower.includes("recommendations")
    ) {
      suggestions.push({
        icon: Lightbulb,
        text: "تقريرك يفتقد قسم التوصيات — أضفه الآن",
        prompt: "أضف قسم التوصيات إلى التقرير الحالي. استخرج توصيات علمية وعملية من محتوى الأوراق البحثية.",
      });
    }

    // Missing evaluation/critical analysis?
    if (
      !lower.includes("تقييم") &&
      !lower.includes("نقاط القوة") &&
      !lower.includes("نقاط قوة") &&
      !lower.includes("ملاحظات")
    ) {
      suggestions.push({
        icon: ClipboardCheck,
        text: "أضف تقييماً نقدياً للأوراق البحثية",
        prompt: "قيّم الأوراق البحثية المقدمة في الجلسة: اذكر لكل ورقة نقاط القوة والملاحظات البناءة.",
      });
    }

    // Missing discussions/Q&A section?
    if (
      !lower.includes("نقاش") &&
      !lower.includes("أسئلة") &&
      !lower.includes("مناقشة") &&
      !lower.includes("discussion")
    ) {
      suggestions.push({
        icon: MessageSquare,
        text: "أضف قسم النقاشات والأسئلة",
        prompt: "أضف قسم النقاشات إلى التقرير. لخّص الأسئلة المطروحة من الجمهور والإجابات عليها.",
      });
    }

    // Report is long → suggest summarizing.
    if (report.length > 1500) {
      suggestions.push({
        icon: FileText,
        text: "تقريرك طويل — لخّصه في نقاط مختصرة",
        prompt: "لخّص التقرير الحالي في نقاط مختصرة ومحددة.",
      });
    }

    // Report lacks structure → suggest formatting.
    if (
      !lower.includes("أولاً") &&
      !lower.includes("ثانياً") &&
      !lower.includes("ثالثاً") &&
      !lower.includes("1.") &&
      !lower.includes("2.")
    ) {
      suggestions.push({
        icon: AlignRight,
        text: "نسّق التقرير كوثيقة علمية بترقيم",
        prompt: "أعد تنسيق التقرير الحالي كوثيقة علمية رسمية بترقيم علمي (أولاً، ثانياً، ثالثاً) بدون أي رموز زخرفية.",
      });
    }

    // If no suggestions (report looks complete), offer refinement.
    if (suggestions.length === 0) {
      suggestions.push({
        icon: Sparkles,
        text: "تقريرك يبدو مكتملًا — حسّنه بأسلوب أكثر رصانة",
        prompt: "أعد صياغة التقرير الحالي بأسلوب علمي أكثر رصانة واحترافية.",
      });
    }

    return suggestions.slice(0, 4); // Max 4 suggestions.
  }, [mode, currentReport]);

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

  // ── Quick actions ──
  // In "report" mode: the 5 features live inside the thinker chat.
  //   1. توليد التقرير  → calls /api/ai/generate-report (full report from PDFs)
  //   2. تلخيص          → agent one-shot prompt
  //   3. تنسيق وثيقة    → agent one-shot prompt
  //   4. استخراج التوصيات → agent one-shot prompt
  //   5. تقييم الأوراق  → agent one-shot prompt
  // In "question" mode: 2 quick actions for crafting a question.
  const reportActions = [
    {
      label: "توليد التقرير",
      icon: Sparkles,
      primary: true,
      run: () => handleGenerateReport(),
    },
    {
      label: "تلخيص",
      icon: FileText,
      primary: false,
      run: () =>
        send("لخّص التقرير الحالي في نقاط مختصرة ومحددة."),
    },
    {
      label: "تنسيق وثيقة",
      icon: AlignRight,
      primary: false,
      run: () =>
        send(
          "أعد تنسيق التقرير الحالي كوثيقة علمية رسمية بترقيم علمي (أولاً، ثانياً، ثالثاً) بدون أي رموز زخرفية.",
        ),
    },
    {
      label: "استخراج التوصيات",
      icon: Lightbulb,
      primary: false,
      run: () =>
        send(
          "استخرج جميع التوصيات من التقرير الحالي واعرضها في قائمة مرقمة واضحة.",
        ),
    },
    {
      label: "تقييم الأوراق",
      icon: ClipboardCheck,
      primary: false,
      run: () =>
        send(
          "قيّم الأوراق البحثية المقدمة في الجلسة: اذكر لكل ورقة نقاط القوة والملاحظات البناءة.",
        ),
    },
  ];

  const questionActions = [
    {
      label: "وضّح السؤال",
      icon: Lightbulb,
      primary: false,
      run: () => send("ساعدني في توضيح سؤالي ليكون أكثر دقة."),
    },
    {
      label: "اجعله علمياً",
      icon: Sparkles,
      primary: false,
      run: () => send("أعد صياغة سؤالي بأسلوب علمي دقيق."),
    },
  ];

  const quickActions = mode === "report" ? reportActions : questionActions;
  const busy = loading || generatingReport;

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
              المفكّر — وكيل أمين السر
              {lastProvider && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-[#D4AF37]">
                  {lastProvider}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-white/60" dir="rtl">
              {mode === "report"
                ? "محادثة مباشرة مع وكيل أمين السر — كل أدوات التحرير هنا"
                : "يساعدك في صياغة سؤالك"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* History button — shows saved conversations */}
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            aria-label="محادثات سابقة"
            title="محادثات سابقة"
            className={[
              "relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
              showHistory
                ? "border-[#D4AF37] bg-[#D4AF37] text-[#0B1B3D]"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20",
            ].join(" ")}
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            {savedConversations.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D4AF37] px-1 text-[9px] font-bold text-[#0B1B3D]">
                {savedConversations.length}
              </span>
            )}
          </button>
          {/* New conversation button */}
          <button
            type="button"
            onClick={handleReset}
            aria-label="محادثة جديدة"
            title="محادثة جديدة"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* History panel — slides down when showHistory is true */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-[#E2E5EC] bg-[#F5F6F8]"
          >
            <div className="max-h-64 overflow-y-auto p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-[#9CA3AF]" dir="rtl">
                <MessageSquare className="h-3 w-3" aria-hidden />
                المحادثات السابقة ({savedConversations.length})
              </p>
              {savedConversations.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#9CA3AF]" dir="rtl">
                  لا توجد محادثات محفوظة بعد
                </p>
              ) : (
                <div className="space-y-1.5">
                  {savedConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={[
                        "group flex items-center gap-2 rounded-lg border p-2 transition-all",
                        currentConvId === conv.id
                          ? "border-[#D4AF37] bg-white shadow-sm"
                          : "border-[#E2E5EC] bg-white hover:border-[#D4AF37]/40",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadConversation(conv)}
                        className="min-w-0 flex-1 text-right"
                        dir="rtl"
                      >
                        <p className="truncate text-xs font-semibold text-[#0B1B3D]">
                          {conv.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#9CA3AF]" dir="rtl">
                          {conv.messages.length} رسالة · محور {conv.trackId}
                          {conv.paperSlot ? ` · ورقة ${conv.paperSlot}` : ""}
                          {" · "}
                          {new Date(conv.updatedAt).toLocaleDateString("ar", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(conv.id)}
                        aria-label="حذف"
                        title="حذف المحادثة"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages — scrollable */}
      <div
        ref={scrollRef}
        className="scroll-elegant min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F5F6F8] p-4"
      >
        {/* Empty state — with proactive suggestions */}
        {messages.length === 0 && !busy && (
          <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4ECD0]">
              <Brain className="h-7 w-7 text-[#D4AF37]" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0B1B3D]" dir="rtl">
                مرحباً، أنا المفكّر
              </p>
              <p className="mt-1 text-xs text-[#6B7280]" dir="rtl">
                {mode === "report"
                  ? "تواصل معي مباشرة، أو اختر إحدى الأدوات أدناه"
                  : "اكتب لي فكرتك، وسأساعدك في صياغتها بشكل احترافي"}
              </p>
            </div>

            {/* Proactive suggestions (report mode only) */}
            {mode === "report" && proactiveSuggestions.length > 0 && (
              <div className="w-full max-w-sm space-y-2">
                <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#D4AF37]" dir="rtl">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  اقتراحات استباقية
                </p>
                {proactiveSuggestions.map((suggestion, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + idx * 0.08 }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => send(suggestion.prompt)}
                    disabled={busy}
                    className="group flex w-full items-center gap-2.5 rounded-xl border border-[#D4AF37]/30 bg-white p-3 text-right shadow-sm transition-all hover:border-[#D4AF37] hover:shadow-md disabled:opacity-50"
                    dir="rtl"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4ECD0] text-[#D4AF37] transition-transform group-hover:scale-110">
                      <suggestion.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-[#0B1B3D]">
                      {suggestion.text}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
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
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
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

        {/* Loading indicator (regular agent) — smooth pulsing wave */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex gap-2"
          >
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8941F] text-[#0B1B3D] shadow-sm"
            >
              <Brain className="h-3.5 w-3.5" aria-hidden />
            </motion.span>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-5 py-4 shadow-sm ring-1 ring-[#E2E5EC]">
              <motion.span
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                className="h-2 w-2 rounded-full bg-[#D4AF37]"
              />
              <motion.span
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                className="h-2 w-2 rounded-full bg-[#D4AF37]"
              />
              <motion.span
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="h-2 w-2 rounded-full bg-[#D4AF37]"
              />
            </div>
          </motion.div>
        )}

        {/* Generating-report indicator */}
        {generatingReport && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8941F] text-[#0B1B3D] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-[#E2E5EC]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" aria-hidden />
              <span className="text-xs font-medium text-[#0B1B3D]" dir="rtl">
                جاري قراءة ملفات PDF وتوليد التقرير الشامل...
              </span>
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
            <div className="scroll-elegant mb-2 max-h-40 overflow-y-auto rounded-lg bg-white p-2 text-xs leading-relaxed text-[#0B1B3D]" dir="rtl">
              {pendingReport.slice(0, 500)}
              {pendingReport.length > 500 ? "..." : ""}
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

      {/* Quick actions — always visible (so the chair can use them mid-conversation) */}
      <div className="shrink-0 border-t border-[#E2E5EC] bg-white p-2.5">
        <p className="mb-1.5 px-1 text-[10px] font-bold text-[#9CA3AF]" dir="rtl">
          {mode === "report" ? "أدوات أمين السر" : "اقتراحات سريعة"}
        </p>
        <div className="scroll-elegant flex gap-1.5 overflow-x-auto pb-0.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.run}
              disabled={busy}
              className={[
                "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold transition-colors disabled:opacity-50",
                action.primary
                  ? "border border-[#D4AF37] bg-gradient-to-l from-[#0B1B3D] to-[#07152F] text-[#D4AF37] hover:shadow-md"
                  : "border border-[#E2E5EC] bg-white text-[#0B1B3D] hover:border-[#D4AF37]/50 hover:bg-[#F4ECD0]/40",
              ].join(" ")}
              dir="rtl"
            >
              <action.icon className="h-3 w-3" aria-hidden />
              {action.label}
            </button>
          ))}
        </div>
      </div>

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
            disabled={busy}
            className="scroll-elegant max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-2 text-sm text-[#0B1B3D] placeholder:text-[#9CA3AF] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
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
