"use client";

import { useEffect, useRef, useState } from "react";
import { preloadVideoUrl, warmClipKey } from "@/lib/preload-video";

/** Keeps a visible cascade even when videos resolve from cache instantly. */
const MIN_REVEAL_GAP_MS = 55;

/** How many hover clips to warm at once while revealing in list order. */
const WARM_CONCURRENCY = 3;

export type PreloadMediaItem = {
  id: string;
  /** Hover video URL; omit/empty to reveal immediately. */
  videoUrl?: string | null;
  /** Preview start (seconds) — preload seeks here before resolving. */
  startTime?: number;
};

function visibleKey(ids: Set<string>) {
  return [...ids].sort().join(",");
}

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Warms visible hover clips with a small concurrency window (same players
 * hover will adopt), then reveals titles in list order with a short cascade gap.
 */
export function useSequentialMediaPreload(
  items: PreloadMediaItem[],
  visibleIds: Set<string>,
  priorityUrl?: string,
  enabled = true,
  priorityStartTime = 0,
) {
  const [readyIds, setReadyIds] = useState(() => new Set<string>());
  const readyIdsRef = useRef(new Set<string>());
  const readyUrlsRef = useRef(new Set<string>());
  const itemsRef = useRef(items);
  const visibleIdsRef = useRef(visibleIds);

  itemsRef.current = items;
  visibleIdsRef.current = visibleIds;

  const queueKey = items
    .map(
      (item) =>
        `${item.id}:${item.videoUrl ?? ""}:${item.startTime ?? 0}`,
    )
    .join("|");
  const visibilityKey = visibleKey(visibleIds);

  useEffect(() => {
    if (!enabled) {
      readyIdsRef.current = new Set();
      readyUrlsRef.current = new Set();
      setReadyIds((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }

    // Keep already-revealed titles when the filtered set changes so overlapping
    // items don't blank out and cascade again — but only if this id's clip is
    // still the one we warmed (category/discipline can swap the hover URL).
    const preserved = new Set(
      itemsRef.current
        .filter((item) => {
          if (!readyIdsRef.current.has(item.id)) return false;
          const url = item.videoUrl;
          if (!url) return true;
          return readyUrlsRef.current.has(
            warmClipKey(url, item.startTime ?? 0),
          );
        })
        .map((item) => item.id),
    );
    if (setsEqual(readyIdsRef.current, preserved)) return;
    readyIdsRef.current = preserved;
    setReadyIds(new Set(preserved));
  }, [queueKey, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    function markUrlReady(url: string, startTime: number) {
      const urlKey = warmClipKey(url, startTime);
      readyUrlsRef.current.add(urlKey);
      readyUrlsRef.current.add(url);
    }

    /** Start a warm without blocking; shares work via preloadVideoUrl's cache. */
    function kickWarm(url: string, startTime: number) {
      const urlKey = warmClipKey(url, startTime);
      if (readyUrlsRef.current.has(urlKey)) return;
      void preloadVideoUrl(url, startTime).then(() => {
        if (cancelled) return;
        markUrlReady(url, startTime);
      });
    }

    async function awaitWarm(url: string, startTime: number) {
      const urlKey = warmClipKey(url, startTime);
      if (readyUrlsRef.current.has(urlKey)) return;
      await preloadVideoUrl(url, startTime);
      if (cancelled) return;
      markUrlReady(url, startTime);
    }

    async function pump() {
      if (readyIdsRef.current.size > 0) {
        setReadyIds(new Set(readyIdsRef.current));
      }

      const pending = itemsRef.current.filter(
        (item) =>
          visibleIdsRef.current.has(item.id) &&
          !readyIdsRef.current.has(item.id),
      );

      // Active/hovered clip gets a head start before the window fills.
      if (priorityUrl) {
        kickWarm(priorityUrl, priorityStartTime);
      }

      let lastRevealAt = 0;

      for (let i = 0; i < pending.length; i++) {
        if (cancelled) return;

        // Prefetch current + upcoming clips up to WARM_CONCURRENCY.
        for (
          let j = i;
          j < Math.min(i + WARM_CONCURRENCY, pending.length);
          j++
        ) {
          const ahead = pending[j];
          if (ahead.videoUrl) {
            kickWarm(ahead.videoUrl, ahead.startTime ?? 0);
          }
        }

        const item = pending[i];
        const url = item.videoUrl;
        const startTime = item.startTime ?? 0;
        if (url) {
          await awaitWarm(url, startTime);
          if (cancelled) return;
        }

        const elapsed = performance.now() - lastRevealAt;
        if (lastRevealAt > 0 && elapsed < MIN_REVEAL_GAP_MS) {
          await wait(MIN_REVEAL_GAP_MS - elapsed);
          if (cancelled) return;
        }

        readyIdsRef.current.add(item.id);
        lastRevealAt = performance.now();
        setReadyIds(new Set(readyIdsRef.current));
      }
    }

    void pump();

    return () => {
      cancelled = true;
    };
  }, [enabled, priorityUrl, priorityStartTime, queueKey, visibilityKey]);

  return { readyIds };
}
