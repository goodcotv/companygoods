"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildVimeoEmbedSrc,
  parseVimeoUrl,
  type VimeoVideo,
} from "@/lib/vimeo";

type VimeoBackgroundProps = {
  src: string;
  className?: string;
  title?: string;
  /** Fill parent like object-cover (for full-page backgrounds) */
  cover?: boolean;
  /** Seconds into the video to begin muted looping preview. */
  startTime?: number;
  /** Fires once the embed is ready to show (after seek when startTime is set). */
  onReady?: () => void;
};

const VIMEO_ORIGIN = "https://player.vimeo.com";

function postVimeoMessage(
  iframe: HTMLIFrameElement,
  message: Record<string, unknown>,
) {
  iframe.contentWindow?.postMessage(message, "*");
}

function parseVimeoEvent(data: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Muted looping Vimeo backdrop for hover previews and list backgrounds.
 * Uses Vimeo's background mode (autoplay + loop + no chrome).
 * When startTime > 0, seeks via the player API and restarts from that point.
 */
export function VimeoBackground({
  src,
  className = "",
  title = "Video",
  cover = true,
  startTime = 0,
  onReady,
}: VimeoBackgroundProps) {
  const video = parseVimeoUrl(src);
  if (!video) return null;

  return (
    <VimeoBackgroundEmbed
      video={video}
      className={className}
      title={title}
      cover={cover}
      startTime={startTime}
      onReady={onReady}
    />
  );
}

function VimeoBackgroundEmbed({
  video,
  className,
  title,
  cover,
  startTime,
  onReady,
}: {
  video: VimeoVideo;
  className: string;
  title: string;
  cover: boolean;
  startTime: number;
  onReady?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewReady, setPreviewReady] = useState(startTime <= 0);
  const embedSrc = buildVimeoEmbedSrc(video, "background", startTime);

  useEffect(() => {
    setPreviewReady(startTime <= 0);
  }, [video.id, video.hash, startTime]);

  useEffect(() => {
    if (previewReady) onReady?.();
  }, [previewReady, onReady]);

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    postVimeoMessage(iframe, { method: "addEventListener", value: "play" });
    if (startTime > 0) {
      postVimeoMessage(iframe, { method: "addEventListener", value: "ready" });
      postVimeoMessage(iframe, {
        method: "addEventListener",
        value: "timeupdate",
      });
    } else {
      setPreviewReady(true);
    }
  }, [startTime]);

  useEffect(() => {
    if (startTime <= 0) return;

    let lastSeconds = 0;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;

      const data = parseVimeoEvent(event.data);
      if (!data) return;

      if (data.event === "ready") {
        postVimeoMessage(iframe, {
          method: "setCurrentTime",
          value: startTime,
        });
        postVimeoMessage(iframe, { method: "play" });
        return;
      }

      if (
        data.event === "timeupdate" &&
        data.data &&
        typeof data.data === "object"
      ) {
        const payload = data.data as { seconds?: number };
        const seconds = payload.seconds ?? 0;
        if (Math.abs(seconds - startTime) < 2) {
          setPreviewReady(true);
        }
        // Natural end / loop jumped back to 0 — restart from preview start
        if (lastSeconds > 1 && seconds < 1) {
          postVimeoMessage(iframe, {
            method: "setCurrentTime",
            value: startTime,
          });
          postVimeoMessage(iframe, { method: "play" });
        }
        lastSeconds = seconds;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [startTime]);

  const iframeClass = cover
    ? "pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
    : "pointer-events-none h-full w-full border-0";

  return (
    <div
      className={`relative overflow-hidden bg-black ${
        cover ? `h-full w-full ${className}` : className
      }`}
      aria-hidden
    >
      <iframe
        ref={iframeRef}
        src={embedSrc}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        onLoad={handleIframeLoad}
        className={`${iframeClass} ${
          previewReady ? "opacity-100" : "opacity-0"
        } transition-opacity`}
      />
    </div>
  );
}
