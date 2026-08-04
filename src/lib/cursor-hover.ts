const INTERACTIVE_SELECTOR =
  "a, button, [role='button'], input, textarea, label";

const OVERFLOW_PX = 2;

/**
 * True when list content meaningfully overflows its visible area.
 * Prefers a visual last-child check when scrolled to top — `scrollHeight`
 * alone can false-positive by a few pixels on flex list frames.
 */
export function isListOverflowing(list: HTMLElement): boolean {
  const overflow = list.scrollHeight - list.clientHeight;
  if (overflow <= OVERFLOW_PX) return false;

  // At rest: if the last item is fully visible, treat as non-scrollable
  if (list.scrollTop <= OVERFLOW_PX) {
    const last = list.lastElementChild;
    if (last instanceof HTMLElement) {
      const listRect = list.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      if (lastRect.bottom <= listRect.bottom + OVERFLOW_PX) {
        return false;
      }
    }
  }

  return true;
}

/** True when the pointer is over a scrollable list or home scroll surface, not over text/controls. */
export function shouldShowScrollCursor(
  x: number,
  y: number,
  eventTarget?: EventTarget | null,
): boolean {
  const fromPoint = document.elementFromPoint(x, y);
  const fromEvent = eventTarget instanceof Element ? eventTarget : null;
  const el = fromPoint ?? fromEvent;

  if (!el) return false;
  // Native cursor over names / buttons — [ scroll ] only in the gaps around them
  if (el.closest(INTERACTIVE_SELECTOR)) return false;

  if (el.closest("[data-scroll-cursor]")) return true;

  const list = el.closest("[data-scrollable-list]");
  if (!(list instanceof HTMLElement)) return false;
  return isListOverflowing(list);
}
