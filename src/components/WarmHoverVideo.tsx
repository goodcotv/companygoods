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

  // Boolean only — parseVimeoUrl() returns a new object each render and would
  // remount/pause the warmed iframe on every parent update.
  const isVimeo = parseVimeoUrl(src) != null;

  useLayoutEffect(() => {
    if (isVimeo) return;

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

    const start = async () => {
      try {
        if (startTime > 0 && Math.abs(video.currentTime - startTime) > 1) {
          video.currentTime = startTime;
        }
        if (!playingRef.current) {
          return;
        }
        await video.play();
        if (!playingRef.current) {
          video.pause();
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
  }, [src, startTime, fit, isVimeo]);

  useLayoutEffect(() => {
    if (isVimeo) return;
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      if (video.paused) {
        void video
          .play()
          .then(() => onReadyRef.current?.(true))
          .catch(() => onReadyRef.current?.(false));
        return;
      }
      onReadyRef.current?.(true);
      return;
    }
    video.pause();
  }, [playing, isVimeo]);

  useLayoutEffect(() => {
    if (!isVimeo) return;

    let released = false;
    const iframe = adoptWarmVimeo(src, startTime);
    iframeRef.current = iframe;
    const alreadyReady = iframe.dataset.hoverReady === "true";
    setWarmVimeoVisible(iframe, fit, alreadyReady && playingRef.current);

    void preloadVideoUrl(src, startTime).then(() => {
      if (released) return;
      iframe.dataset.hoverReady = "true";
      if (playingRef.current) {
        setWarmVimeoVisible(iframe, fit, true);
      }
      onReadyRef.current?.(true);
    });

    return () => {
      released = true;
      iframeRef.current = null;
      releaseWarmVimeo(src, startTime, iframe, fit);
    };
  }, [src, startTime, fit, isVimeo]);

  useLayoutEffect(() => {
    if (!isVimeo) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const warmed = iframe.dataset.hoverReady === "true";
    setWarmVimeoVisible(iframe, fit, playing && warmed);
  }, [playing, fit, isVimeo]);

  if (isVimeo) {
    return null;
  }

  return <div ref={hostRef} className={`h-full w-full bg-black ${className}`} />;
}
