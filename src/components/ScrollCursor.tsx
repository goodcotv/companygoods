"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { shouldShowScrollCursor } from "@/lib/cursor-hover";
import { useCoarsePointerDevice } from "@/hooks/useCoarsePointerDevice";
import { useHideNativeCursor } from "@/hooks/useHideNativeCursor";
import { useNavigationPending } from "@/hooks/useNavigationPending";

/** Shows `[ scroll ]` over scroll surfaces, or a spinner while a page route is loading. */
export function ScrollCursor() {
  const pathname = usePathname();
  const isCoarsePointer = useCoarsePointerDevice();
  const isNavigating = useNavigationPending();
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);
  const posRef = useRef({ x: 0, y: 0 });

  const isStudio = pathname?.startsWith("/studio") ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isCoarsePointer || isStudio) return;

    const flushPos = () => {
      setPos({ ...posRef.current });
      rafRef.current = undefined;
    };

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setHasMoved(true);
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flushPos);
      }
      setActive(shouldShowScrollCursor(e.clientX, e.clientY, e.target));
    };

    const onOver = (e: PointerEvent) => {
      setActive(shouldShowScrollCursor(e.clientX, e.clientY, e.target));
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, true);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerover", onOver, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, isCoarsePointer, isStudio]);

  const showCustom = (isNavigating || active) && hasMoved;
  useHideNativeCursor(showCustom && !isCoarsePointer && !isStudio);

  if (!mounted || isCoarsePointer || isStudio || !showCustom) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] whitespace-nowrap font-sans text-[11pt] font-medium uppercase leading-none text-white md:text-[13pt]"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {isNavigating ? (
        <div
          className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/25 border-t-white"
          aria-hidden
        />
      ) : (
        "[ scroll ]"
      )}
    </div>,
    document.body,
  );
}
