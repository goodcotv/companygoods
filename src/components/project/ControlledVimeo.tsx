"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { useVideoTheater } from "@/hooks/useVideoTheater";
import { buildVimeoEmbedSrc, type VimeoVideo } from "@/lib/vimeo";

type ControlledVimeoProps = {
  video: VimeoVideo;
  className?: string;
  title?: string;
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

/** Controlled project-page Vimeo player matching ControlledVideo chrome. */
export function ControlledVimeo({
  video,
  className = "",
  title = "Video",
}: ControlledVimeoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const userPausedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const isTheaterOpenRef = useRef(false);
  const durationRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  isTheaterOpenRef.current = isTheaterOpen;

  const closeTheater = useCallback(() => setIsTheaterOpen(false), []);
  useVideoTheater(isTheaterOpen, closeTheater);

  useEffect(() => {
    setEmbedSrc(
      buildVimeoEmbedSrc(
        video,
        "controlled",
        undefined,
        window.location.origin,
      ),
    );
    setIframeLoaded(false);
    setPlayerReady(false);
  }, [video.hash, video.id]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !embedSrc || !iframeLoaded) return;

    let alive = true;
    let player: Player;

    try {
      player = new Player(iframe);
      playerRef.current = player;
    } catch {
      return;
    }

    const onPlay = () => {
      isPlayingRef.current = true;
      setIsPlaying(true);
      setShowPlayOverlay(false);
    };

    const onPause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setShowPlayOverlay(true);
    };

    const onTimeUpdate = (data: { seconds: number; duration: number }) => {
      if (isSeekingRef.current) return;
      if (data.duration > 0) {
        durationRef.current = data.duration;
      }
      const total = data.duration || durationRef.current;
      setProgress(total ? (data.seconds / total) * 100 : 0);
    };

    player.on("play", onPlay);
    player.on("pause", onPause);
    player.on("timeupdate", onTimeUpdate);

    void player
      .ready()
      .then(async () => {
        if (!alive) return;
        setPlayerReady(true);
        const [dur, muted] = await Promise.all([
          player.getDuration(),
          player.getMuted(),
        ]);
        if (!alive) return;
        if (dur > 0) durationRef.current = dur;
        setIsMuted(muted);
        if (!userPausedRef.current) {
          void player.play().catch(() => {
            setIsPlaying(false);
            setShowPlayOverlay(true);
          });
        }
      })
      .catch(() => {
        if (alive) setPlayerReady(true);
      });

    return () => {
      alive = false;
      player.off("play", onPlay);
      player.off("pause", onPause);
      player.off("timeupdate", onTimeUpdate);
      playerRef.current = null;
      void player.destroy();
    };
  }, [embedSrc, iframeLoaded]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !playerReady) return;
    if (isPlaying) {
      userPausedRef.current = true;
      void player.pause();
    } else {
      userPausedRef.current = false;
      void player.play();
    }
  }, [isPlaying, playerReady]);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player || !playerReady) return;
    const nextMuted = !isMuted;
    void player
      .setMuted(nextMuted)
      .then(() => (nextMuted ? undefined : player.setVolume(1)))
      .then(() => setIsMuted(nextMuted))
      .catch(() => {});
  }, [isMuted, playerReady]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
      const player = playerRef.current;
      if (!player || !playerReady) return;
      const total = durationRef.current;
      if (!total) return;
      const value = Number((e.target as HTMLInputElement).value);
      const seconds = (value / 100) * total;
      setProgress(value);
      isSeekingRef.current = true;
      void player.setCurrentTime(seconds).finally(() => {
        isSeekingRef.current = false;
      });
    },
    [playerReady],
  );

  // Pause when scrolled out of view (inline only); resume if user didn't pause
  useEffect(() => {
    if (isTheaterOpen) return;

    const player = playerRef.current;
    const container = containerRef.current;
    if (!player || !playerReady || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (isTheaterOpenRef.current) return;

        if (entry.isIntersecting) {
          if (!userPausedRef.current && !isPlayingRef.current) {
            void player.play().catch(() => {});
          }
          return;
        }
        void player.pause().catch(() => {});
      },
      { threshold: 0.35 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [playerReady, isTheaterOpen, video.id]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReady) return;

    if (userPausedRef.current) {
      void player.pause().catch(() => {});
      setIsPlaying(false);
      setShowPlayOverlay(true);
      return;
    }

    void player
      .play()
      .then(() => {
        setIsPlaying(true);
        setShowPlayOverlay(false);
      })
      .catch(() => {
        setIsPlaying(false);
        setShowPlayOverlay(true);
      });
  }, [isTheaterOpen, playerReady]);

  const clampedProgress = Math.min(100, Math.max(0, progress));

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
            : `relative h-full w-full overflow-hidden bg-black ${className}`
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
              ? "relative flex h-full w-full items-center justify-center"
              : "absolute inset-0 overflow-hidden"
          }
        >
          {embedSrc ? (
            <iframe
              ref={iframeRef}
              src={embedSrc}
              title={title}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setIframeLoaded(true)}
              className={
                isTheaterOpen
                  ? "pointer-events-none aspect-video h-auto w-full max-h-[calc(100dvh-4.5rem)] max-w-[calc((100dvh-4.5rem)*16/9)] border-0"
                  : "pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
              }
            />
          ) : null}

          <button
            type="button"
            onClick={togglePlay}
            disabled={!playerReady}
            className="absolute inset-0 z-10"
            aria-label={isPlaying ? "Pause" : "Play"}
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
