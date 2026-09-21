"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileBrandBar } from "./MobileBrandBar";
import { textMobileMenu, textMobileMenuToggle } from "@/lib/typography";
import type { Section } from "./BottomChrome";

const MENU_ITEMS: { label: string; section: Section }[] = [
  { label: "WORK", section: "work" },
  { label: "TALENT", section: "talent" },
  { label: "INFO", section: "info" },
];

/** Overlay dissolve — hold this long so the destination can layout underneath. */
export const MOBILE_MENU_OVERLAY_FADE_S = 0.5;
export const MOBILE_MENU_VEIL_IN_MS = 280;
export const MOBILE_MENU_COVER_MS = 500;
const ITEMS_FADE_S = 0.8;
const ITEMS_FADE_DELAY_S = 0.18;
const ITEMS_STAGGER_S = 0.09;
const ITEMS_HIDE_S = 0.2;
const VEIL_IN_S = MOBILE_MENU_VEIL_IN_MS / 1000;
const MENU_EASE = [0.22, 1, 0.36, 1] as const;
/** Soft fade-in — ease-out snaps to visible and reads as a pop. */
const ITEM_FADE_EASE = [0.45, 0.05, 0.55, 0.95] as const;

function itemFadeTransition(visible: boolean, index: number) {
  if (visible) {
    return {
      duration: ITEMS_FADE_S,
      delay: ITEMS_FADE_DELAY_S + index * ITEMS_STAGGER_S,
      ease: ITEM_FADE_EASE,
    };
  }
  return { duration: ITEMS_HIDE_S, delay: 0, ease: "easeOut" as const };
}

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (section: Section) => boolean | void;
  /** Logo tap — Work scroll landing, then close. Menu > Work opens list. */
  onGoHome: () => boolean | void;
  activeSection: Section;
};

export function MobileMenu({
  open,
  onClose,
  onNavigate,
  onGoHome,
  activeSection,
}: MobileMenuProps) {
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    if (open) setDissolving(false);
  }, [open]);

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
    if (dissolving) return;
    if (onNavigate(section)) setDissolving(true);
  }

  function handleGoHome() {
    if (dissolving) return;
    if (onGoHome()) setDissolving(true);
  }

  const showChrome = open && !dissolving;

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
          transition={{ duration: MOBILE_MENU_OVERLAY_FADE_S, ease: MENU_EASE }}
        >
          {/*
            Fade a constant-radius blur over the live page. On navigate, go
            through black so the destination can mount without a visible jump,
            then the whole overlay dissolves to reveal it.
          */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-black/25 backdrop-blur-[96px] transform-gpu"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOBILE_MENU_OVERLAY_FADE_S, ease: MENU_EASE }}
          />
          <motion.div
            className="pointer-events-none absolute inset-0 bg-black transform-gpu"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: dissolving ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: dissolving ? VEIL_IN_S : MOBILE_MENU_OVERLAY_FADE_S,
              ease: MENU_EASE,
            }}
          />

          <div
            className={`relative z-10 flex min-h-0 flex-1 flex-col ${
              dissolving ? "pointer-events-none" : ""
            }`}
          >
            {/* Opt out of shared logo layout — page mark underneath already owns it */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showChrome ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={itemFadeTransition(showChrome, 0)}
            >
              <MobileBrandBar onClick={handleGoHome} layoutId={false} />
            </motion.div>

            <nav
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.75rem,2.5vh,1.25rem)] px-4 pb-[max(4rem,env(safe-area-inset-bottom))]"
              aria-label="Primary"
            >
              {MENU_ITEMS.map((item, index) => {
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
                    <motion.span
                      className="block"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: showChrome ? 1 : 0 }}
                      transition={itemFadeTransition(showChrome, index + 1)}
                    >
                      {item.label}
                    </motion.span>
                  </button>
                );
              })}
            </nav>
          </div>

          <motion.button
            type="button"
            onClick={handleGoHome}
            className={`absolute right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 ${textMobileMenuToggle} ${
              dissolving ? "pointer-events-none" : ""
            }`}
            aria-label="Return home"
            initial={{ opacity: 0 }}
            animate={{ opacity: showChrome ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={itemFadeTransition(showChrome, MENU_ITEMS.length + 1)}
          >
            HOME
          </motion.button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
