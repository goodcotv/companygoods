import { useEffect } from "react";

/** Hides the system cursor while the custom circle / scroll cursor is showing. */
export function useHideNativeCursor(active: boolean) {
  useEffect(() => {
    if (!active) return;

    document.documentElement.dataset.customCursor = "";

    return () => {
      delete document.documentElement.dataset.customCursor;
    };
  }, [active]);
}
