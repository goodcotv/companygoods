"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileBrandBar } from "./MobileBrandBar";
import { textMobileMenu } from "@/lib/typography";
import type { Section } from "./BottomChrome";

const MENU_ITEMS: { label: string; section: Section }[] = [
  { label: "WORK", section: "work" },
  { label: "TALENT", section: "talent" },
  { label: "INFO", section: "info" },
];

const OVERLAY_FADE_S = 0.4;
const ITEMS_FADE_S = 0.42;
const ITEMS_FADE_DELAY_S = 0.12;

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (section: Section) => void;
  /** Logo tap — Work scroll landing, then close. Menu > Work opens list. */
  onGoHome: () => void;
  activeSection: Section;
};

export function MobileMenu({
  open,
  onClose,
  onNavigate,
  onGoHome,
  activeSection,
}: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  function handleNavigate(section: Section) {
    onNavigate(section);
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mobile-menu"
          className="fixed inset-0 z-[10050] flex flex-col text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: OVERLAY_FADE_S, ease: "easeOut" }}
        >
          {/*
            Fade a constant-radius blur over the live page. Opacity is cheap
            to animate; remounting a second intro clip was not.
          */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-black/25 backdrop-blur-[96px] transform-gpu"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: OVERLAY_FADE_S, ease: "easeOut" }}
          />

          {/* Opt out of shared logo layout — page mark underneath already owns it */}
          <MobileBrandBar onClick={onGoHome} layoutId={false} />

          <motion.nav
            className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.75rem,2.5vh,1.25rem)] px-4 pb-[max(4rem,env(safe-area-inset-bottom))]"
            aria-label="Primary"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: {
                duration: ITEMS_FADE_S,
                delay: ITEMS_FADE_DELAY_S,
                ease: "easeOut",
              },
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2, ease: "easeOut" },
            }}
          >
            {MENU_ITEMS.map((item) => {
              const isActive = activeSection === item.section;
              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => handleNavigate(item.section)}
                  className={`text-center text-white transition-opacity hover:opacity-70 ${textMobileMenu} ${
                    isActive ? "opacity-100" : "opacity-90"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
