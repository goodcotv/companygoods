"use client";

import { useEffect, useRef, useState } from "react";
import { preloadVideoUrl } from "@/lib/preload-video";
import {
  preloadProjectHoverStill,
  waitForProjectHoverStill,
  type HoverStillProject,
} from "@/lib/hover-still";

/** Keeps a visible cascade even when posters resolve from cache instantly. */
const MIN_REVEAL_GAP_MS = 55;

/** How many hover clips / posters to warm at once while revealing in list order. */
const WARM_CONCURRENCY = 5;

export type PreloadMediaItem = {
  id: string;
  /** Hover video URL; omit/empty to reveal from the still alone. */
  videoUrl?: string | null;
  /** Preview start (seconds) — preload seeks here in the background. */
  startTime?: number;
  posterImageUrl?: string;
  imageUrl?: string;
  muxVideoUrl?: string;
};

function visibleKey(ids: Set<string>) {
  return [...ids].sort().join(",");
}

function clipKey(url: string, startTime = 0) {
  return `${url}@@${startTime}`;
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

function asStillProject(item: PreloadMediaItem): HoverStillProject {
  return {
    videoUrl: item.videoUrl ?? undefined,
    imageUrl: item.imageUrl,
    posterImageUrl: item.posterImageUrl,
    muxVideoUrl: item.muxVideoUrl ?? item.videoUrl ?? undefined,
    videoPreviewStartSeconds: item.startTime,
  };
}

/**
 * Reveals titles once their hover poster is ready. Clips warm in the
 * background and are used when playback actually starts.
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
  const warmedClipsRef = useRef(new Set<string>());
  const itemsRef = useRef(items);
  const visibleIdsRef = useRef(visibleIds);

  itemsRef.current = items;
  visibleIdsRef.current = visibleIds;

  const queueKey = items
    .map(
      (item) =>
        `${item.id}:${item.videoUrl ?? ""}:${item.startTime ?? 0}:${item.posterImageUrl ?? ""}:${item.imageUrl ?? ""}`,
    )
    .join("|");
  const visibilityKey = visibleKey(visibleIds);

  useEffect(() => {
    if (!enabled) {
      readyIdsRef.current = new Set();
      warmedClipsRef.current = new Set();
      setReadyIds((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }

    const preserved = new Set(
      itemsRef.current
        .filter((item) => readyIdsRef.current.has(item.id))
        .map((item) => item.id),
    );
    if (setsEqual(readyIdsRef.current, preserved)) return;
    readyIdsRef.current = preserved;
    setReadyIds(new Set(preserved));
  }, [queueKey, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    function kickWarm(url: string, startTime: number) {
      const urlKey = clipKey(url, startTime);
      if (warmedClipsRef.current.has(urlKey)) return;
      warmedClipsRef.current.add(urlKey);
      void preloadVideoUrl(url, startTime);
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

      const priorityItem = priorityUrl
        ? itemsRef.current.find((item) => item.videoUrl === priorityUrl)
        : undefined;
      if (priorityItem) preloadProjectHoverStill(asStillProject(priorityItem));
      if (priorityUrl) {
        kickWarm(priorityUrl, priorityItem?.startTime ?? priorityStartTime);
      }

      for (const item of pending) {
        preloadProjectHoverStill(asStillProject(item));
        if (item.videoUrl) {
          kickWarm(item.videoUrl, item.startTime ?? 0);
        }
      }

      let lastRevealAt = 0;

      for (let i = 0; i < pending.length; i++) {
        if (cancelled) return;

        for (
          let j = i;
          j < Math.min(i + WARM_CONCURRENCY, pending.length);
          j++
        ) {
          void waitForProjectHoverStill(asStillProject(pending[j]));
        }

        await waitForProjectHoverStill(asStillProject(pending[i]));
        if (cancelled) return;

        const elapsed = performance.now() - lastRevealAt;
        if (lastRevealAt > 0 && elapsed < MIN_REVEAL_GAP_MS) {
          await wait(MIN_REVEAL_GAP_MS - elapsed);
          if (cancelled) return;
        }

        readyIdsRef.current.add(pending[i].id);
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
