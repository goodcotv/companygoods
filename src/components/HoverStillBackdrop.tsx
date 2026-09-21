"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { WarmHoverVideo } from "@/components/WarmHoverVideo";
import {
  getProjectHoverStillUrl,
  isHoverStillReady,
  markHoverStillReady,
  peekVimeoThumbnail,
  preloadHoverStill,
  resolveVimeoThumbnail,
  waitForHoverStill,
  type HoverStillProject,
} from "@/lib/hover-still";
import { isVimeoUrl } from "@/lib/vimeo";

type HoverStillBackdropProps = {
  videoUrl?: string;
  stillProject?: HoverStillProject | null;
  startTime?: number;
  className?: string;
  playing?: boolean;
  /**
   * Force the still on top (e.g. top-of-list changed mid-scroll). Lets the
   * previous clip keep decoding underneath without a fresh play() that would
   * cancel iOS scroll momentum.
   */
  preferStill?: boolean;
  onVideoReady?: () => void;
};

export function HoverStillBackdrop({
  videoUrl,
  stillProject,
  startTime = 0,
  className = "absolute inset-0",
  playing = true,
  preferStill = false,
  onVideoReady,
}: HoverStillBackdropProps) {
  const stillFromProject = getProjectHoverStillUrl(stillProject);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [vimeoStillUrl, setVimeoStillUrl] = useState<string | undefined>(() =>
    videoUrl && isVimeoUrl(videoUrl) ? peekVimeoThumbnail(videoUrl) : undefined,
  );
  const incomingStill = stillFromProject || vimeoStillUrl;
  const [mountedStill, setMountedStill] = useState<string | undefined>(
    incomingStill,
  );
  const isVimeo = Boolean(videoUrl && isVimeoUrl(videoUrl));
  const showVideo = videoPlaying && !preferStill;
  const displayStill = mountedStill || incomingStill;
  // Don't start a new clip while the finger is still moving.
  const mountVideo = Boolean(videoUrl) && !preferStill;

  useLayoutEffect(() => {
    setVideoReady(false);
    setVideoPlaying(false);
    setVimeoStillUrl(
      videoUrl && isVimeoUrl(videoUrl)
        ? peekVimeoThumbnail(videoUrl)
        : undefined,
    );
  }, [videoUrl, startTime]);

  useLayoutEffect(() => {
    if (!incomingStill) return;
    if (incomingStill === mountedStill) return;

    if (isHoverStillReady(incomingStill)) {
      setMountedStill(incomingStill);
      return;
    }

    let cancelled = false;
    void waitForHoverStill(incomingStill, "high").then(() => {
      if (cancelled || !isHoverStillReady(incomingStill)) return;
      setMountedStill(incomingStill);
    });
    return () => {
      cancelled = true;
    };
  }, [incomingStill, mountedStill]);

  useEffect(() => {
    if (!videoUrl || !isVimeoUrl(videoUrl)) return;

    let cancelled = false;
    void resolveVimeoThumbnail(videoUrl).then((url) => {
      if (cancelled || !url) return;
      preloadHoverStill(url);
      if (!stillFromProject) {
        setVimeoStillUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stillFromProject, videoUrl]);

  useEffect(() => {
    if (!playing || !videoReady || preferStill) {
      if (!videoReady || !playing || preferStill) setVideoPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setVideoPlaying(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [videoReady, playing, preferStill]);

  if (!videoUrl && !displayStill) return null;

  return (
    <div className={className} aria-hidden>
      {displayStill ? (
        <img
          src={displayStill}
          alt=""
          draggable={false}
          decoding="async"
          className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-300 ${
            showVideo ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => markHoverStillReady(displayStill)}
        />
      ) : null}
      {mountVideo ? (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            showVideo && !isVimeo ? "z-20 opacity-100" : "z-0 opacity-0"
          }`}
        >
          <WarmHoverVideo
            src={videoUrl!}
            startTime={startTime}
            playing={playing}
            className="h-full w-full"
            onPreviewReady={(ready) => {
              if (!ready) return;
              setVideoReady(true);
              onVideoReady?.();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
