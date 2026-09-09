"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/** An item becomes the hovered one when its top reaches this far into the list. */
const ACTIVATION_INSET_PX = 48;
const TOP_REST_PX = 1;
const BOTTOM_REST_PX = 8;
/**
 * Wait until the list stops moving before swapping / resuming the playing clip.
 * Starting play() mid-swipe makes iOS fight the scroll and feel stuck.
 */
const SCROLL_SETTLE_MS = 140;

type UseScrollHoverItemOptions<T extends HTMLElement> = {
  enabled: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  itemRefs: RefObject<Map<string, T>>;
  itemIds: readonly string[];
  onActivate: (id: string) => void;
};

/**
 * On touch layouts, drive list "hover" from scroll position instead of tap.
 * The item whose top has crossed a line near the top of the list becomes active;
 * tapping the name then goes straight to the detail page.
 *
 * Activation waits until scroll settles so the current clip keeps playing
 * through the swipe and only swaps when the next item is locked in.
 */
export function useScrollHoverItem<T extends HTMLElement>({
  enabled,
  scrollRef,
  itemRefs,
  itemIds,
  onActivate,
}: UseScrollHoverItemOptions<T>) {
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const itemIdsRef = useRef(itemIds);
  itemIdsRef.current = itemIds;
  const itemIdsKey = itemIds.join("\0");

  useLayoutEffect(() => {
    if (!enabled) return;
    const root = scrollRef.current;
    if (!root) return;

    let frame = 0;
    let settle = 0;
    let pendingId: string | null = null;
    let committedId: string | null = null;

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

    const commit = (id: string | null) => {
      if (id == null || id === committedId) return;
      committedId = id;
      onActivateRef.current(id);
    };

    const scheduleCommit = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        commit(pendingId);
      }, SCROLL_SETTLE_MS);
    };

    const pickPending = () => {
      pendingId = closestId();
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pickPending();
        scheduleCommit();
      });
    };

    const onScrollEnd = () => {
      window.clearTimeout(settle);
      pickPending();
      commit(pendingId);
    };

    const onResize = () => {
      pickPending();
      commit(pendingId);
    };

    // First paint: activate immediately so the list isn't blank.
    pickPending();
    commit(pendingId);

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
