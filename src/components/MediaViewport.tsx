"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedCornerBrackets } from "./AnimatedCornerBrackets";
import { MutedLoopVideo } from "./MutedLoopVideo";
import { VimeoBackground } from "./VimeoBackground";
import {
  getProjectHoverStillUrl,
  preloadHoverStill,
  resolveVimeoThumbnail,
} from "@/lib/hover-still";
import { isVimeoUrl } from "@/lib/vimeo";

type MediaViewportProps = {
  title: string;
  className?: string;
  src?: string;
  type?: "video" | "image";
  /** Poster / hero still shown until the video paints a frame. */
  poster?: string;
  /** Seconds into muted preview videos (from Sanity videoPreviewStart). */
  startTime?: number;
  cornersLayoutId?: string;
  /** Camera-style corner brackets. Default true. */
  corners?: boolean;
  /** Border radius in px. Default 16. */
  radius?: number;
  /** When false, Vimeo/video layers can pause to save work. */
  active?: boolean;
  onReady?: () => void;
};

export function MediaViewport({
  title,
  className = "",
  src,
  type = "video",
  poster,
  startTime = 0,
  cornersLayoutId = "media-corners",
  corners = true,
  radius = 16,
  active = true,
  onReady,
}: MediaViewportProps) {
  const useVimeo = type === "video" && Boolean(src && isVimeoUrl(src));
  const stillFromSource =
    type === "video"
      ? getProjectHoverStillUrl({
          videoUrl: src,
          muxVideoUrl: src,
          posterImageUrl: poster,
          videoPreviewStartSeconds: startTime,
        })
      : poster;
  const [ready, setReady] = useState(false);
  const [vimeoStillUrl, setVimeoStillUrl] = useState<string | undefined>();
  const imageRef = useRef<HTMLImageElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const resolvedStill = stillFromSource || vimeoStillUrl;

  useEffect(() => {
    setReady(false);
    setVimeoStillUrl(undefined);
  }, [src, startTime, poster]);

  useEffect(() => {
    if (ready) onReadyRef.current?.();
  }, [ready]);

  useEffect(() => {
    if (!src || !useVimeo || stillFromSource) return;

    let cancelled = false;
    void resolveVimeoThumbnail(src).then((url) => {
      if (cancelled || !url) return;
      preloadHoverStill(url);
      setVimeoStillUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src, stillFromSource, useVimeo]);

  useEffect(() => {
    if (useVimeo || type === "video" || !src) return;

    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) setReady(true);
  }, [src, type, useVimeo]);

  const mediaClass = `pointer-events-none h-full w-full scale-[1.01] object-cover transition-opacity duration-700 ease-out ${
    ready ? "opacity-100" : "opacity-0"
  }`;

  return (
    <div
      className={`relative overflow-hidden bg-black ${className}`}
      style={{ borderRadius: radius }}
      role="img"
      aria-label={src ? `${title} ${type}` : `${title} placeholder`}
    >
      {src ? (
        useVimeo ? (
          <div
            className={`h-full w-full transition-opacity duration-700 ease-out ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          >
            <VimeoBackground
              src={src}
              title={title}
              startTime={startTime}
              active={active}
              className="h-full w-full"
              onReady={() => setReady(true)}
            />
          </div>
        ) : type === "video" ? (
          <MutedLoopVideo
            src={src}
            startTime={startTime}
            active={active}
            onReady={() => setReady(true)}
            className={mediaClass}
          />
        ) : (
          <img
            ref={imageRef}
            src={src}
            alt={title}
            onLoad={() => setReady(true)}
            className={mediaClass}
          />
        )
      ) : null}
      {type === "video" && resolvedStill ? (
        <img
          src={resolvedStill}
          alt=""
          draggable={false}
          decoding="async"
          className={`pointer-events-none absolute inset-0 z-[1] h-full w-full scale-[1.01] object-cover transition-opacity duration-700 ease-out ${
            ready ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : null}
      {corners ? (
        <AnimatedCornerBrackets inset={10} layoutId={cornersLayoutId} />
      ) : null}
    </div>
  );
}
