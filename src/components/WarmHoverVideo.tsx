"use client";

import { useLayoutEffect, useRef } from "react";
import {
  adoptWarmVideo,
  adoptWarmVimeo,
  preloadVideoUrl,
  releaseWarmVideo,
  releaseWarmVimeo,
  setWarmVimeoVisible,
} from "@/lib/preload-video";
import { parseVimeoUrl } from "@/lib/vimeo";

type WarmHoverVideoProps = {
  src: string;
  startTime?: number;
  fit?: "cover" | "contain";
  playing?: boolean;
  className?: string;
  onPreviewReady?: (ready: boolean) => void;
};

export function WarmHoverVideo({
  src,
  startTime = 0,
  fit = "cover",
  playing = true,
  className = "",
  onPreviewReady,
}: WarmHoverVideoProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onReadyRef = useRef(onPreviewReady);
  const playingRef = useRef(playing);
  onReadyRef.current = onPreviewReady;
  playingRef.current = playing;

  const vimeo = parseVimeoUrl(src);

  useLayoutEffect(() => {
    if (vimeo) return;

    const host = hostRef.current;
    if (!host) return;

    let released = false;
    const video = adoptWarmVideo(src, startTime);
    videoRef.current = video;
    const objectFit = fit === "contain" ? "contain" : "cover";
    video.style.cssText = `display:block;width:100%;height:100%;object-fit:${objectFit};background:#000`;
    host.appendChild(video);

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      onReadyRef.current?.(true);
    }

    const start = async () => {
      try {
        if (startTime > 0 && Math.abs(video.currentTime - startTime) > 1) {
          video.currentTime = startTime;
        }
        if (!playingRef.current) {
          if (!released) onReadyRef.current?.(true);
          return;
        }
        await video.play();
        if (!playingRef.current) {
          video.pause();
          if (!released) onReadyRef.current?.(true);
          return;
        }
        if (startTime > 0 && Math.abs(video.currentTime - startTime) > 1) {
          video.currentTime = startTime;
        }
        if (!released) onReadyRef.current?.(true);
      } catch {
        if (!released) onReadyRef.current?.(false);
      }
    };

    void start();

    return () => {
      released = true;
      videoRef.current = null;
      releaseWarmVideo(src, startTime, video);
    };
  }, [src, startTime, fit, vimeo]);

  useLayoutEffect(() => {
    if (vimeo) return;
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      if (video.paused) void video.play().catch(() => {});
      return;
    }
    video.pause();
  }, [playing, vimeo]);

  useLayoutEffect(() => {
    if (!vimeo) return;

    let released = false;
    const iframe = adoptWarmVimeo(src, startTime);
    iframeRef.current = iframe;
    setWarmVimeoVisible(iframe, fit, playingRef.current);

    void preloadVideoUrl(src, startTime).then(() => {
      if (!released) onReadyRef.current?.(true);
    });

    return () => {
      released = true;
      iframeRef.current = null;
      releaseWarmVimeo(src, startTime, iframe, fit);
    };
  }, [src, startTime, fit, vimeo]);

  useLayoutEffect(() => {
    if (!vimeo) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    setWarmVimeoVisible(iframe, fit, playing);
  }, [playing, fit, vimeo]);

  if (vimeo) {
    return null;
  }

  return <div ref={hostRef} className={`h-full w-full bg-black ${className}`} />;
}
