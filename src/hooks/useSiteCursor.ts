import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCursorHoverState } from "@/lib/cursor-hover";
import { useCoarsePointerDevice } from "@/hooks/useCoarsePointerDevice";
import { useHideNativeCursor } from "@/hooks/useHideNativeCursor";

/** White/gray dot cursor for standard site pages. */
export function useSiteCursor() {
  const isCoarsePointer = useCoarsePointerDevice();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHoveringText, setIsHoveringText] = useState(false);
  const [isHoveringScrollableList, setIsHoveringScrollableList] =
    useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const rafRef = useRef<number | undefined>(undefined);
  const positionRef = useRef({ x: 0, y: 0 });
  const lastHoverCheckRef = useRef(0);

  const isStudio = pathname?.startsWith("/studio") ?? false;
  const showCursor = ready && !isCoarsePointer && !isStudio;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!showCursor) return;

    const updatePosition = () => {
      setCursorPos({ ...positionRef.current });
      rafRef.current = undefined;
    };

    const handleMouseMove = (e: MouseEvent) => {
      setHasMoved(true);
      positionRef.current = { x: e.clientX, y: e.clientY };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updatePosition);
      }

      const now = Date.now();
      if (now - lastHoverCheckRef.current > 100) {
        lastHoverCheckRef.current = now;
        const { isHoveringText: overText, isHoveringScrollableList: overList } =
          getCursorHoverState(e.clientX, e.clientY, e.target);
        setIsHoveringText(overText);
        setIsHoveringScrollableList(overList);
      }
    };

    const handlePointerOver = (e: PointerEvent) => {
      const { isHoveringText: overText, isHoveringScrollableList: overList } =
        getCursorHoverState(e.clientX, e.clientY, e.target);
      setIsHoveringText(overText);
      setIsHoveringScrollableList(overList);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("pointerover", handlePointerOver, true);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointerover", handlePointerOver, true);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [showCursor]);

  useHideNativeCursor(showCursor);

  return {
    cursorPos,
    isHoveringText,
    isHoveringScrollableList,
    showCursor,
    hasMoved,
  };
}
