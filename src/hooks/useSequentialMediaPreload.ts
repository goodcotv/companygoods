"use client";

import { useEffect, useRef, useState } from "react";
import { preloadVideoUrl } from "@/lib/preload-video";

/** Keeps a visible cascade even when videos resolve from cache instantly. */
const MIN_REVEAL_GAP_MS = 55;

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

function urlKeyFor(url: string, startTime: number) {
  return startTime > 0 ? `${url}#t=${startTime}` : url;
}

/**
 * Downloads visible hover videos in parallel (cold CDN), then reveals titles
 * in order with a short cascade gap. Refresh feels fast because the browser
 * cache makes each preload resolve almost immediately.
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
    // items don't blank out and cascade again.
    const nextIds = new Set(itemsRef.current.map((item) => item.id));
    const preserved = new Set(
      [...readyIdsRef.current].filter((id) => nextIds.has(id)),
    );
    if (setsEqual(readyIdsRef.current, preserved)) return;
    readyIdsRef.current = preserved;
    setReadyIds(new Set(preserved));
  }, [queueKey, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function pump() {
      // Warm the idle/intro backdrop without blocking title reveal.
      if (priorityUrl) {
        const priorityKey = urlKeyFor(priorityUrl, priorityStartTime);
        void preloadVideoUrl(priorityUrl, priorityStartTime).then(() => {
          readyUrlsRef.current.add(priorityKey);
          readyUrlsRef.current.add(priorityUrl);
        });
      }

      // Start every visible download now — don't serialize network waits.
      // Reveal order below still awaits in list order for the cascade.
      const pendingByUrl = new Map<string, Promise<void>>();

      for (const item of itemsRef.current) {
        if (!visibleIdsRef.current.has(item.id)) continue;
        if (readyIdsRef.current.has(item.id)) continue;

        const url = item.videoUrl;
        if (!url) continue;

        const startTime = item.startTime ?? 0;
        const urlKey = urlKeyFor(url, startTime);
        if (readyUrlsRef.current.has(urlKey) || pendingByUrl.has(urlKey)) {
          continue;
        }

        const pending = preloadVideoUrl(url, startTime).then(() => {
          readyUrlsRef.current.add(urlKey);
          readyUrlsRef.current.add(url);
        });
        pendingByUrl.set(urlKey, pending);
      }

      let lastRevealAt = 0;

      for (const item of itemsRef.current) {
        if (cancelled) return;
        if (!visibleIdsRef.current.has(item.id)) continue;
        if (readyIdsRef.current.has(item.id)) continue;

        const url = item.videoUrl;
        const startTime = item.startTime ?? 0;
        const urlKey = url ? urlKeyFor(url, startTime) : "";

        if (url && !readyUrlsRef.current.has(urlKey)) {
          const pending = pendingByUrl.get(urlKey) ?? preloadVideoUrl(url, startTime);
          if (cancelled) return;
          await pending;
          if (cancelled) return;
          readyUrlsRef.current.add(urlKey);
          readyUrlsRef.current.add(url);
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
