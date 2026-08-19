"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedCornerBrackets } from "./AnimatedCornerBrackets";
import { MutedLoopVideo } from "./MutedLoopVideo";
import { VimeoBackground } from "./VimeoBackground";
import { isVimeoUrl } from "@/lib/vimeo";

type MediaViewportProps = {
  title: string;
  className?: string;
  src?: string;
  type?: "video" | "image";
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
  startTime = 0,
  cornersLayoutId = "media-corners",
  corners = true,
  radius = 16,
  active = true,
  onReady,
}: MediaViewportProps) {
  const useVimeo = type === "video" && Boolean(src && isVimeoUrl(src));
  const [ready, setReady] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    setReady(false);
  }, [src, startTime]);

  useEffect(() => {
    if (ready) onReadyRef.current?.();
  }, [ready]);

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
      className={`relative overflow-hidden ${ready ? "bg-black" : "bg-transparent"} ${className}`}
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
      {corners ? (
        <AnimatedCornerBrackets inset={10} layoutId={cornersLayoutId} />
      ) : null}
    </div>
  );
}
