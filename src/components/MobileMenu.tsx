"use client";

import { useEffect } from "react";
import { VimeoBackground } from "./VimeoBackground";
import { MobileBrandBar } from "./MobileBrandBar";
import { isVideoMediaUrl, isVimeoUrl } from "@/lib/vimeo";
import type { Section } from "./BottomChrome";

const MENU_ITEMS: { label: string; section: Section }[] = [
  { label: "WORK", section: "work" },
  { label: "TALENT", section: "talent" },
  { label: "INFO", section: "info" },
];

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (section: Section) => void;
  /** Logo tap — Work scroll landing, then close. Menu > Work opens list. */
  onGoHome: () => void;
  activeSection: Section;
  /** Intro / backdrop media URL (video or image). */
  mediaUrl?: string;
};

export function MobileMenu({
  open,
  onClose,
  onNavigate,
  onGoHome,
  activeSection,
  mediaUrl,
}: MobileMenuProps) {
  const isVimeo = Boolean(mediaUrl && isVimeoUrl(mediaUrl));
  const isVideo = isVideoMediaUrl(mediaUrl);

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

  if (!open) return null;

  function handleNavigate(section: Section) {
    onNavigate(section);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      {/* Blurred backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {mediaUrl ? (
          <div className="absolute inset-0 opacity-90 [filter:blur(96px)_brightness(1)]">
            {isVimeo ? (
              <VimeoBackground
                src={mediaUrl}
                title="Menu background"
                className="h-full w-full"
              />
            ) : isVideo ? (
              <video
                src={mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={mediaUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#2a2420]" />
        )}
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Top brand — shared mobile mark placement */}
      {/* Opt out of shared logo layout — page mark underneath already owns it */}
      <MobileBrandBar onClick={onGoHome} layoutId={false} />

      {/* Centered section links */}
      <nav
        className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.85rem,3.2vh,1.35rem)] px-4 pb-[max(4rem,env(safe-area-inset-bottom))]"
        aria-label="Primary"
      >
        {MENU_ITEMS.map((item) => {
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => handleNavigate(item.section)}
              className={`font-heading text-[clamp(1.55rem,6.5vw,2.15rem)] font-extrabold uppercase leading-none tracking-[-0.01em] text-white transition-opacity hover:opacity-70 ${
                isActive ? "opacity-100" : "opacity-90"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
