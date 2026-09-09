"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/** An item becomes the hovered one when its top reaches this far into the list. */
const ACTIVATION_INSET_PX = 48;
const TOP_REST_PX = 1;
const BOTTOM_REST_PX = 8;
/** Let momentum finish before swapping the playing clip (avoids iOS killing scroll). */
const SCROLL_SETTLE_MS = 120;

type UseScrollHoverItemOptions<T extends HTMLElement> = {
  enabled: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  itemRefs: RefObject<Map<string, T>>;
  itemIds: readonly string[];
  /** Fires as soon as a row hits the top line (list highlight / rolodex index). */
  onActivate: (id: string) => void;
  /**
   * Fires after scroll settles with the top row — use this to start the video
   * so play() doesn't cancel momentum scrolling.
   */
  onSettleActivate?: (id: string) => void;
};

/**
 * On touch layouts, drive list "hover" from scroll position instead of tap.
 * Rolodex-style: the top-line row updates immediately while you scroll; the
 * playing video waits until the swipe settles so scroll stays fluid.
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

    const schedulePlaying = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        commitPlaying(activeId);
      }, SCROLL_SETTLE_MS);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        commitActive(closestId());
        schedulePlaying();
      });
    };

    const onScrollEnd = () => {
      window.clearTimeout(settle);
      const id = closestId();
      commitActive(id);
      commitPlaying(id);
    };

    const onResize = () => {
      const id = closestId();
      commitActive(id);
      commitPlaying(id);
    };

    const initial = closestId();
    commitActive(initial);
    commitPlaying(initial);

    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(root);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
    };
  }, [enabled, itemIdsKey, itemRefs, scrollRef]);
}
