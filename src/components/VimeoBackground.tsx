"use client";

import { useEffect, useRef, useState } from "react";
import { markVideoUrlPreloaded } from "@/lib/preload-video";
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
  /** When false, the player is kept paused (inactive scroll layers). */
  active?: boolean;
  /** Fires once the embed has painted a real frame (after seek when startTime is set). */
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
  active = true,
  onReady,
}: VimeoBackgroundProps) {
  const video = parseVimeoUrl(src);
  if (!video) return null;

  return (
    <VimeoBackgroundEmbed
      src={src}
      video={video}
      className={className}
      title={title}
      cover={cover}
      startTime={startTime}
      active={active}
      onReady={onReady}
    />
  );
}

function VimeoBackgroundEmbed({
  src,
  video,
  className,
  title,
  cover,
  startTime,
  active,
  onReady,
}: {
  src: string;
  video: VimeoVideo;
  className: string;
  title: string;
  cover: boolean;
  startTime: number;
  active: boolean;
  onReady?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onReadyRef = useRef(onReady);
  const readyNotifiedRef = useRef(false);
  const [previewReady, setPreviewReady] = useState(false);
  const embedSrc = buildVimeoEmbedSrc(video, "background", startTime);

  onReadyRef.current = onReady;

  useEffect(() => {
    readyNotifiedRef.current = false;
    setPreviewReady(false);
  }, [video.id, video.hash, startTime]);

  const markReady = () => {
    setPreviewReady(true);
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    markVideoUrlPreloaded(src, startTime);
    onReadyRef.current?.();
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let lastSeconds = 0;

    const subscribe = () => {
      postVimeoMessage(iframe, { method: "addEventListener", value: "ready" });
      postVimeoMessage(iframe, { method: "addEventListener", value: "play" });
      postVimeoMessage(iframe, {
        method: "addEventListener",
        value: "playing",
      });
      postVimeoMessage(iframe, {
        method: "addEventListener",
        value: "timeupdate",
      });
    };

    const kickPlayback = () => {
      if (!active) {
        postVimeoMessage(iframe, { method: "pause" });
        return;
      }
      if (startTime > 0) {
        postVimeoMessage(iframe, {
          method: "setCurrentTime",
          value: startTime,
        });
      }
      postVimeoMessage(iframe, { method: "play" });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;
      if (event.source !== iframe.contentWindow) return;

      const data = parseVimeoEvent(event.data);
      if (!data) return;

      if (data.event === "ready") {
        subscribe();
        kickPlayback();
        return;
      }

      if (
        data.event === "timeupdate" &&
        data.data &&
        typeof data.data === "object"
      ) {
        const payload = data.data as { seconds?: number };
        const seconds = payload.seconds ?? 0;
        if (startTime > 0 && Math.abs(seconds - startTime) < 2) {
          markReady();
          if (!active) {
            postVimeoMessage(iframe, { method: "pause" });
          }
        } else if (startTime <= 0 && seconds > 0.05) {
          markReady();
          if (!active) {
            postVimeoMessage(iframe, { method: "pause" });
          }
        }
        // Natural end / loop jumped back to 0 — restart from preview start
        if (startTime > 0 && lastSeconds > 1 && seconds < 1) {
          kickPlayback();
        }
        lastSeconds = seconds;
      }
    };

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", subscribe);
    subscribe();
    kickPlayback();
    const readyFallback = window.setTimeout(markReady, 8000);

    return () => {
      window.clearTimeout(readyFallback);
      window.removeEventListener("message", onMessage);
      iframe.removeEventListener("load", subscribe);
    };
  }, [active, src, startTime, video.hash, video.id]);

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
        className={`${iframeClass} ${
          previewReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
