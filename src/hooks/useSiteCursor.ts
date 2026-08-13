import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { getCursorHoverState } from "@/lib/cursor-hover";
import { useCoarsePointerDevice } from "@/hooks/useCoarsePointerDevice";
import { useHideNativeCursor } from "@/hooks/useHideNativeCursor";

function applyCursorTransform(
  el: HTMLElement | null,
  x: number,
  y: number,
) {
  if (!el) return;
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

/** White/gray dot cursor for standard site pages. */
export function useSiteCursor(cursorElRef: RefObject<HTMLDivElement | null>) {
  const isCoarsePointer = useCoarsePointerDevice();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isHoveringText, setIsHoveringText] = useState(false);
  const [isHoveringScrollableList, setIsHoveringScrollableList] =
    useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const positionRef = useRef({ x: 0, y: 0 });
  const lastHoverCheckRef = useRef(0);
  const hasMovedRef = useRef(false);

  const isStudio = pathname?.startsWith("/studio") ?? false;
  const showCursor = ready && !isCoarsePointer && !isStudio;
  // Hide the system cursor as soon as we know this device should use the
  // custom one — don't wait for `ready` / first mouse move, or it flashes.
  const hideNativeCursor = !isCoarsePointer && !isStudio;

  useEffect(() => {
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!showCursor || !hasMoved) return;
    const { x, y } = positionRef.current;
    applyCursorTransform(cursorElRef.current, x, y);
  }, [showCursor, hasMoved, cursorElRef]);

  useEffect(() => {
    if (!showCursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };
      applyCursorTransform(cursorElRef.current, e.clientX, e.clientY);

      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        setHasMoved(true);
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
    };
  }, [showCursor, cursorElRef]);

  useHideNativeCursor(hideNativeCursor);

  return {
    isHoveringText,
    isHoveringScrollableList,
    showCursor,
    hasMoved,
  };
}
