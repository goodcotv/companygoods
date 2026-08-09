"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigationPending } from "@/hooks/useNavigationPending";
import { useSiteCursor } from "@/hooks/useSiteCursor";

export function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const {
    cursorPos,
    isHoveringText,
    isHoveringScrollableList,
    showCursor,
    hasMoved,
  } = useSiteCursor();
  const isNavigating = useNavigationPending();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !showCursor || !hasMoved) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[10070]"
      style={{
        left: `${cursorPos.x}px`,
        top: `${cursorPos.y}px`,
        transform: "translate(-50%, -50%)",
        willChange: "transform",
      }}
    >
      {isNavigating ? (
        <div
          className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/25 border-t-white"
          aria-hidden
        />
      ) : isHoveringText ? (
        <div
          style={{ width: "15px", height: "15px" }}
          className="rounded-full bg-gray-400 transition-colors duration-150"
        />
      ) : isHoveringScrollableList ? (
        <div className="whitespace-nowrap font-sans text-[12pt] font-medium uppercase leading-none text-white md:text-[13pt]">
          [ scroll ]
        </div>
      ) : (
        <div
          style={{ width: "15px", height: "15px" }}
          className="rounded-full bg-white transition-colors duration-150"
        />
      )}
    </div>,
    document.body,
  );
}
