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
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [vimeoStillUrl, setVimeoStillUrl] = useState<string | undefined>();
  const resolvedStill = stillFromProject || vimeoStillUrl;
  const isVimeo = Boolean(videoUrl && isVimeoUrl(videoUrl));

  useLayoutEffect(() => {
    setVideoReady(false);
    setVideoPlaying(false);
    setVimeoStillUrl(undefined);
  }, [videoUrl, stillFromProject, startTime]);

  // Fetch Vimeo thumbnail eagerly as a fallback
  useEffect(() => {
    if (!videoUrl || !isVimeoUrl(videoUrl)) return;
    
    // If we already have a still, preload the Vimeo thumbnail as backup but don't show it
    // If we don't have a still, fetch and show the Vimeo thumbnail
    let cancelled = false;
    void resolveVimeoThumbnail(videoUrl).then((url) => {
      if (cancelled || !url) return;
      preloadHoverStill(url);
      
      // Only set as the visible thumbnail if we don't have another still
      if (!stillFromProject) {
        setVimeoStillUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stillFromProject, videoUrl]);

  // Delay hiding the thumbnail until video is actually playing
  useEffect(() => {
    if (!videoReady) {
      setVideoPlaying(false);
      return;
    }
    
    // For Vimeo, trust the ready state immediately
    if (isVimeo) {
      setVideoPlaying(true);
      return;
    }
    
    // For regular videos, add a small delay to ensure video is rendering
    const timer = setTimeout(() => {
      setVideoPlaying(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [videoReady, isVimeo]);

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
            videoPlaying ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : null}
      {videoUrl ? (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            videoPlaying && !isVimeo ? "z-20 opacity-100" : "z-0 opacity-0"
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
