"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { WarmHoverVideo } from "@/components/WarmHoverVideo";
import {
  getProjectHoverStillUrl,
  preloadHoverStill,
  resolveVimeoThumbnail,
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
  const [vimeoStillUrl, setVimeoStillUrl] = useState<string | undefined>();
  const resolvedStill = stillFromProject || vimeoStillUrl;
  const isVimeo = Boolean(videoUrl && isVimeoUrl(videoUrl));
  const showVideo = videoPlaying && !preferStill;

  useLayoutEffect(() => {
    setVideoReady(false);
    setVideoPlaying(false);
    setVimeoStillUrl(undefined);
  }, [videoUrl, startTime]);

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
      if (!videoReady || !playing) setVideoPlaying(false);
      return;
    }

    if (isVimeo) {
      setVideoPlaying(true);
      return;
    }

    const timer = setTimeout(() => {
      setVideoPlaying(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [videoReady, isVimeo, playing, preferStill]);

  if (!videoUrl && !resolvedStill) return null;

  return (
    <div className={className} aria-hidden>
      {resolvedStill ? (
        <img
          src={resolvedStill}
          alt=""
          draggable={false}
          decoding="async"
          className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-300 ${
            showVideo ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : null}
      {videoUrl ? (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            showVideo && !isVimeo ? "z-20 opacity-100" : "z-0 opacity-0"
          }`}
        >
          <WarmHoverVideo
            src={videoUrl}
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
