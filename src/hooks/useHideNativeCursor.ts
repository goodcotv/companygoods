import { useLayoutEffect } from "react";

let hideNativeCursorCount = 0;

/** Hides the system cursor while the custom circle / scroll cursor is showing. */
export function useHideNativeCursor(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;

    hideNativeCursorCount += 1;
    document.documentElement.dataset.customCursor = "";

    return () => {
      hideNativeCursorCount -= 1;
      // Defer so React Strict Mode remounts can re-apply before the native
      // cursor is restored (otherwise it flashes on every effect cycle).
      queueMicrotask(() => {
        if (hideNativeCursorCount === 0) {
          delete document.documentElement.dataset.customCursor;
        }
      });
    };
  }, [active]);
}
