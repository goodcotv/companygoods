"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type MutedLoopVideoProps = {
  src: string;
  className?: string;
  style?: CSSProperties;
  /** Seconds into the video to begin muted looping preview. */
  startTime?: number;
  "aria-label"?: string;
  onReady?: () => void;
};

function clampPreviewTarget(video: HTMLVideoElement, startTime: number) {
  if (startTime <= 0) return 0;
  const { duration } = video;
  return Number.isFinite(duration)
    ? Math.min(startTime, Math.max(0, duration - 0.05))
    : startTime;
}

/**
 * Muted autoplaying loop for list/talent backdrops.
 * When startTime > 0, seeks there on load and restarts from that point on loop.
 */
export function MutedLoopVideo({
  src,
  className,
  style,
  startTime = 0,
  "aria-label": ariaLabel,
  onReady,
}: MutedLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopSeekingRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastTime = 0;
    let started = false;

    const seekToStart = async () => {
      const target = clampPreviewTarget(video, startTime);
      if (target <= 0) return;
      if (loopSeekingRef.current) return;
      loopSeekingRef.current = true;
      video.currentTime = target;
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (video.paused) {
        await video.play().catch(() => {});
      }
      loopSeekingRef.current = false;
    };

    const start = async () => {
      if (started) return;
      started = true;
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute("muted", "");

      if (startTime > 0) {
        await seekToStart();
      }
      await video.play().catch(() => {});
      onReady?.();
    };

    const onTimeUpdate = () => {
      if (startTime <= 0) return;
      const current = video.currentTime;
      const { duration } = video;

      if (Number.isFinite(duration) && current >= duration - 0.3) {
        void seekToStart();
        lastTime = current;
        return;
      }

      if (current < 1 && lastTime > 2) {
        void seekToStart();
      }
      lastTime = current;
    };

    const readyEvent = startTime > 0 ? "loadeddata" : "loadedmetadata";
    const requiredState =
      startTime > 0
        ? HTMLMediaElement.HAVE_CURRENT_DATA
        : HTMLMediaElement.HAVE_METADATA;

    if (video.readyState >= requiredState) {
      void start();
    } else {
      video.addEventListener(readyEvent, () => void start(), { once: true });
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [src, startTime, onReady]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay={startTime <= 0}
      loop={startTime <= 0}
      muted
      playsInline
      preload={startTime > 0 ? "auto" : "metadata"}
      aria-label={ariaLabel}
      className={className}
      style={style}
    />
  );
}
