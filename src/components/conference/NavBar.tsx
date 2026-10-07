"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { id: "about", label: "عن المؤتمر" },
  { id: "speakers", label: "المتحدثون" },
  { id: "tracks", label: "المحاور" },
  { id: "schedule", label: "البرنامج" },
] as const;

/**
 * Sticky top navigation. Hidden initially (so the hero shines), then slides
 * down once the user scrolls past the hero. Includes a mobile menu.
 */
export function NavBar() {
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const trigger = window.innerHeight * 0.6;
      setVisible(window.scrollY > trigger);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed inset-x-0 top-0 z-40 border-b border-[#D4AF37]/15 bg-[#0B1B3D]/95 text-white shadow-lg backdrop-blur-md"
          aria-label="التنقل"
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            {/* Brand */}
            <button
              type="button"
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              aria-label="العودة إلى أعلى الصفحة"
            >
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" aria-hidden />
              <span className="text-sm font-bold" dir="rtl">
                المؤتمر الدولي الثالث
              </span>
            </button>

            {/* Desktop nav */}
            <div className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  dir="rtl"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 md:hidden"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden border-t border-white/10 bg-[#0B1B3D] md:hidden"
              >
                <div className="flex flex-col gap-1 px-4 py-3">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollTo(item.id)}
                      className="rounded-lg px-3 py-2.5 text-right text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                      dir="rtl"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
