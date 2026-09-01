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
  onVideoReady?: () => void;
};

export function HoverStillBackdrop({
  videoUrl,
  stillProject,
  startTime = 0,
  className = "absolute inset-0",
  onVideoReady,
}: HoverStillBackdropProps) {
  const stillFromProject = getProjectHoverStillUrl(stillProject);
  const [videoReady, setVideoReady] = useState(false);
  const [vimeoStillUrl, setVimeoStillUrl] = useState<string | undefined>();
  const resolvedStill = stillFromProject || vimeoStillUrl;
  const isVimeo = Boolean(videoUrl && isVimeoUrl(videoUrl));

  useLayoutEffect(() => {
    setVideoReady(false);
    setVimeoStillUrl(undefined);
  }, [videoUrl, stillFromProject, startTime]);

  useEffect(() => {
    if (stillFromProject || !videoUrl || !isVimeoUrl(videoUrl)) return;
    let cancelled = false;
    void resolveVimeoThumbnail(videoUrl).then((url) => {
      if (cancelled || !url) return;
      preloadHoverStill(url);
      setVimeoStillUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [stillFromProject, videoUrl]);

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
            videoReady ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : null}
      {videoUrl ? (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            videoReady && !isVimeo ? "z-20 opacity-100" : "z-0 opacity-0"
          }`}
        >
          <WarmHoverVideo
            src={videoUrl}
            startTime={startTime}
            playing
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
