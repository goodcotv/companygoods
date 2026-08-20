"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/** An item becomes the hovered one when its top reaches this far into the list. */
const ACTIVATION_INSET_PX = 48;
const TOP_REST_PX = 1;
const BOTTOM_REST_PX = 8;

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

    const pick = () => {
      const ids = itemIdsRef.current;
      if (ids.length === 0) return;

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
          root.scrollTop + root.clientHeight >= root.scrollHeight - BOTTOM_REST_PX;
        if (atBottom) {
          nextId = ids[ids.length - 1];
        }
      }

      onActivateRef.current(nextId);
    };

    const onScrollOrResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pick();
      });
    };

    pick();
    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    const resizeObserver = new ResizeObserver(onScrollOrResize);
    resizeObserver.observe(root);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      resizeObserver.disconnect();
    };
  }, [enabled, itemIdsKey, itemRefs, scrollRef]);
}
