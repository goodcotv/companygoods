"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ControlledVimeo } from "@/components/project/ControlledVimeo";
import { useVideoTheater } from "@/hooks/useVideoTheater";
import { parseVimeoUrl } from "@/lib/vimeo";

type ControlledVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  priority?: boolean;
};

function MuteIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M8 3H5a2 2 0 00-2 2v3" />
      <path d="M16 3h3a2 2 0 012 2v3" />
      <path d="M8 21H5a2 2 0 01-2-2v-3" />
      <path d="M16 21h3a2 2 0 002-2v-3" />
    </svg>
  );
}

/** Controlled project-page video with letterboxed theater mode. */
export function ControlledVideo({
  src,
  poster,
  className = "",
  priority = false,
}: ControlledVideoProps) {
  const vimeo = parseVimeoUrl(src);
  if (vimeo) {
    return <ControlledVimeo video={vimeo} className={className} />;
  }

  return (
    <ControlledFileVideo
      src={src}
      poster={poster}
      className={className}
      priority={priority}
    />
  );
}

function ControlledFileVideo({
  src,
  poster,
  className = "",
  priority = false,
}: ControlledVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPausedRef = useRef(false);
  const isSeekingRef = useRef(false);
  const isTheaterOpenRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);

  isTheaterOpenRef.current = isTheaterOpen;

  const closeTheater = useCallback(() => setIsTheaterOpen(false), []);
  useVideoTheater(isTheaterOpen, closeTheater);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      void video.play();
      setIsPlaying(true);
    } else {
      userPausedRef.current = true;
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      const total = video?.duration;
      if (!video || !total || !Number.isFinite(total)) return;
      const value = Number((e.target as HTMLInputElement).value);
      video.currentTime = (value / 100) * total;
      setProgress(value);
    },
    [],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (isSeekingRef.current) return;
      const total = video.duration;
      setProgress(total ? (video.currentTime / total) * 100 : 0);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setShowPlayOverlay(false);
    };
    const onPause = () => {
      setIsPlaying(false);
      setShowPlayOverlay(true);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    if (!video.paused) {
      setIsPlaying(true);
      setShowPlayOverlay(false);
    }

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [src]);

  // Pause when scrolled out of view (inline only); resume if user didn't pause
  useEffect(() => {
    if (isTheaterOpen) return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Ignore stale callbacks while theater is open / mid-transition.
        if (isTheaterOpenRef.current) return;

        if (entry.isIntersecting) {
          if (!userPausedRef.current && video.paused) {
            void video.play().catch(() => setIsPlaying(false));
          }
          return;
        }
        if (!video.paused) {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [src, isTheaterOpen]);

  // Keep the same <video> instance across theater open/close so playback
  // time and play/pause state aren't reset by a remount.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (userPausedRef.current) {
      if (!video.paused) video.pause();
      setIsPlaying(false);
      setShowPlayOverlay(true);
      return;
    }

    if (video.paused) {
      void video
        .play()
        .then(() => {
          setIsPlaying(true);
          setShowPlayOverlay(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setShowPlayOverlay(true);
        });
    } else {
      setIsPlaying(true);
      setShowPlayOverlay(false);
    }
  }, [isTheaterOpen]);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const tick = () => {
      if (!isSeekingRef.current) {
        const video = videoRef.current;
        if (video) {
          const total = video.duration;
          setProgress(total ? (video.currentTime / total) * 100 : 0);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Always return a fragment so the video shell stays at the same React tree
  // position when theater toggles (avoids remounting <video>).
  return (
    <>
      {isTheaterOpen ? (
        <div className={`h-full w-full ${className}`} aria-hidden />
      ) : null}
      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className={
          isTheaterOpen
            ? "fixed inset-0 z-[10050] flex h-[100dvh] w-screen items-center justify-center bg-black"
            : `relative h-full w-full bg-black ${className}`
        }
      >
        {isTheaterOpen && (
          <button
            type="button"
            onClick={closeTheater}
            className="pointer-events-auto fixed left-4 top-4 z-[10060] font-display text-[13pt] font-medium uppercase leading-none text-white transition-opacity hover:opacity-70 md:left-8 md:top-8 md:text-[13pt]"
          >
            Back
          </button>
        )}

        <div
          className={
            isTheaterOpen
              ? "relative flex max-h-[calc(100dvh-4.5rem)] max-w-[100vw] items-center justify-center"
              : "absolute inset-0"
          }
        >
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            className={
              isTheaterOpen
                ? "mx-auto h-auto max-h-[calc(100dvh-4.5rem)] w-auto max-w-[100vw] object-contain"
                : "absolute inset-0 h-full w-full object-cover"
            }
            autoPlay
            muted={isMuted}
            playsInline
            preload={priority ? "auto" : "metadata"}
            disablePictureInPicture
            controlsList="nodownload noplaybackrate"
            onContextMenu={(e) => e.preventDefault()}
            onClick={togglePlay}
          />

          {showPlayOverlay && (
            <button
              type="button"
              onClick={togglePlay}
              className="pointer-events-auto absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-white transition-transform hover:scale-105"
              aria-label="Play"
            >
              <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor" aria-hidden>
                <polygon points="24,16 24,48 48,32" />
              </svg>
            </button>
          )}
        </div>

        <div
          className={`pointer-events-auto absolute bottom-[max(3.25rem,calc(1.25rem+env(safe-area-inset-bottom,0px)))] left-4 right-4 flex items-center gap-3 md:bottom-8 md:left-8 md:right-8 md:gap-4 ${
            isTheaterOpen ? "z-[10060]" : "z-20"
          }`}
          {...(!isTheaterOpen ? { "data-project-player-chrome": true } : {})}
        >
          <div className="relative flex flex-1 items-center">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/40"
              aria-hidden
            >
              <div className="h-full bg-white" style={{ width: `${clampedProgress}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={clampedProgress}
              onChange={handleSeek}
              onInput={handleSeek}
              onPointerDown={() => {
                isSeekingRef.current = true;
              }}
              onPointerUp={() => {
                isSeekingRef.current = false;
              }}
              onPointerCancel={() => {
                isSeekingRef.current = false;
              }}
              className="video-seek-input relative z-10 h-3 w-full touch-none"
              aria-label="Seek"
            />
          </div>
          <button
            type="button"
            onClick={toggleMute}
            className="shrink-0 text-white transition-opacity hover:opacity-70"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <MuteIcon muted={isMuted} />
          </button>
          {!isTheaterOpen && (
            <button
              type="button"
              onClick={() => setIsTheaterOpen(true)}
              className="shrink-0 text-white transition-opacity hover:opacity-70"
              aria-label="Open fullscreen"
            >
              <FullscreenIcon />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
