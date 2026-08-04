"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Delay before the loading cursor appears, so fast navigations don't flash. */
const SHOW_DELAY_MS = 100;
/** Safety: never leave the spinner stuck if the route never settles. */
const MAX_PENDING_MS = 10_000;

/** True when the click is an in-app link to a different pathname (not category/query switches). */
function isPageNavigationClick(event: MouseEvent): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const anchor = target.closest("a");
  if (!anchor) return false;
  if (anchor.hasAttribute("download")) return false;

  const linkTarget = anchor.getAttribute("target");
  if (linkTarget && linkTarget !== "_self") return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    // Same path with different ?section= / ?view= etc. — not a page switch.
    return url.pathname !== window.location.pathname;
  } catch {
    return false;
  }
}

/**
 * True while an in-app page navigation is in flight (after a short delay).
 * Query-only changes are ignored.
 */
export function useNavigationPending() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isPageNavigationClick(event)) return;
      setPending(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(false), MAX_PENDING_MS);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  useEffect(() => {
    if (!pending) {
      setShowLoading(false);
      return;
    }

    const id = window.setTimeout(() => setShowLoading(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [pending]);

  return showLoading;
}
