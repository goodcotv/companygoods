"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/** An item becomes the hovered one when its top reaches this far into the list. */
const ACTIVATION_INSET_PX = 48;
const TOP_REST_PX = 1;
const BOTTOM_REST_PX = 8;
/** Wait until the fling/drag stops so we don't swap stills/clips mid-scroll. */
export const SCROLL_SETTLE_MS = 160;

type UseScrollHoverItemOptions<T extends HTMLElement> = {
  enabled: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  itemRefs: RefObject<Map<string, T>>;
  itemIds: readonly string[];
  /** Fires when a row hits the top line (list highlight / still). */
  onActivate: (id: string) => void;
  /**
   * Fires with the settled top row — use this to start the video
   * so play() doesn't cancel momentum scrolling.
   */
  onSettleActivate?: (id: string) => void;
};

/**
 * On touch layouts, drive list "hover" from scroll position instead of tap.
 * Highlight, still, and clip all wait until the swipe settles so iOS can
 * keep native momentum.
 */
export function useScrollHoverItem<T extends HTMLElement>({
  enabled,
  scrollRef,
  itemRefs,
  itemIds,
  onActivate,
  onSettleActivate,
}: UseScrollHoverItemOptions<T>) {
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const onSettleActivateRef = useRef(onSettleActivate);
  onSettleActivateRef.current = onSettleActivate;

  const itemIdsRef = useRef(itemIds);
  itemIdsRef.current = itemIds;
  const itemIdsKey = itemIds.join("\0");

  useLayoutEffect(() => {
    if (!enabled) return;
    const root = scrollRef.current;
    if (!root) return;

    let frame = 0;
    let settle = 0;
    let activeId: string | null = null;
    let playingId: string | null = null;

    const closestId = () => {
      const ids = itemIdsRef.current;
      if (ids.length === 0) return null;

      let nextId = ids[0];

      if (root.scrollTop > TOP_REST_PX) {
        const lineY = root.getBoundingClientRect().top + ACTIVATION_INSET_PX;
        const nodes = itemRefs.current;

        for (const id of ids) {
          const el = nodes.get(id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= lineY) {
            nextId = id;
          } else {
            break;
          }
        }

        const atBottom =
          root.scrollTop + root.clientHeight >=
          root.scrollHeight - BOTTOM_REST_PX;
        if (atBottom) {
          nextId = ids[ids.length - 1];
        }
      }

      return nextId;
    };

    const commitActive = (id: string | null) => {
      if (id == null || id === activeId) return;
      activeId = id;
      onActivateRef.current(id);
    };

    const commitPlaying = (id: string | null) => {
      if (id == null || id === playingId) return;
      playingId = id;
      onSettleActivateRef.current?.(id);
    };

    const pickSettled = () => {
      const id = closestId();
      commitActive(id);
      commitPlaying(id);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        window.clearTimeout(settle);
        settle = window.setTimeout(pickSettled, SCROLL_SETTLE_MS);
      });
    };

    const onResize = () => {
      pickSettled();
    };

    pickSettled();

    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("scrollend", pickSettled);
    window.addEventListener("resize", onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(root);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("scrollend", pickSettled);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
    };
  }, [enabled, itemIdsKey, itemRefs, scrollRef]);
}
