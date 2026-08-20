"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { markGoHomeNavigation, useGoHome } from "./GoHomeContext";

type BrandHeaderProps = {
  /** `work` = small mark; `display` = large wordmark */
  variant?: "work" | "display";
  /** Soften the mark (info page). */
  muted?: boolean;
  /** Override the default width utility for the mark. */
  widthClass?: string;
  /** Skip intrinsic viewBox crop (avoids clipping when the mark is sized smaller). */
  uncropped?: boolean;
  /** When set, logo acts as a button instead of linking home. */
  onClick?: () => void;
  /**
   * Shared layout id for page-to-page grow/shrink (matches corner brackets).
   * Pass `false` to opt out (e.g. mobile menu overlay).
   */
  layoutId?: string | false;
  className?: string;
};

const SIZES = {
  work: {
    src: "/brand/logo-small.svg",
    width: 699,
    height: 277,
    widthClass: "w-[min(100%,17.5rem)] md:w-[19rem]",
    /** Intrinsic padding in the SVG viewBox (px at source size). */
    crop: { left: 34, top: 41, right: 21, bottom: 55 },
  },
  display: {
    src: "/brand/logo-big.svg",
    width: 699,
    height: 277,
    // Keep in sync with ScrollView display wordmark max width (900px)
    widthClass: "w-[900px] max-w-full",
    // Measured content bbox so "C"/"G" flush with camera left edge
    crop: { left: 34, top: 41, right: 21, bottom: 55 },
  },
} as const;

/** Same easing as AnimatedCornerBrackets. */
const LOGO_LAYOUT_TRANSITION = {
  layout: {
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

const MotionLink = motion.create(Link);

export function BrandHeader({
  variant = "work",
  muted = false,
  widthClass: widthClassProp,
  uncropped = false,
  onClick,
  layoutId = "brand-logo",
  className = "",
}: BrandHeaderProps) {
  // AppShell SPA views stay on `/`, so Link href="/" no-ops — prefer goHome.
  const goHome = useGoHome();
  const handleClick = onClick ?? goHome ?? undefined;
  const { src, width, height, widthClass, crop } = SIZES[variant];
  const markWidth = widthClassProp ?? widthClass;
  const activeCrop = uncropped ? null : crop;
  const resolvedLayoutId = layoutId === false ? undefined : layoutId;

  /**
   * Crop via a fixed aspect-ratio window + absolutely positioned image.
   * Do NOT use %-margins for vertical crop: CSS % margins are relative to
   * width, which collapses COMPANY/GOODS when the mark is much narrower than the display size.
   */
  const contentW = activeCrop
    ? width - activeCrop.left - activeCrop.right
    : width;
  const contentH = activeCrop
    ? height - activeCrop.top - activeCrop.bottom
    : height;

  const markClass = `relative block text-inherit no-underline ${markWidth} ${
    activeCrop ? "overflow-hidden" : ""
  }`;
  const markStyle = activeCrop
    ? { aspectRatio: `${contentW} / ${contentH}` }
    : undefined;
  const image = (
    <Image
      src={src}
      alt="Company Goods — A Post Production Company"
      width={width}
      height={height}
      priority
      // Next's optimizer re-encodes to lossy WebP (no alpha), which
      // turns the transparent mark into an opaque black plate.
      unoptimized
      style={
        activeCrop
          ? {
              position: "absolute",
              left: `${(-activeCrop.left / contentW) * 100}%`,
              top: `${(-activeCrop.top / contentH) * 100}%`,
              width: `${(width / contentW) * 100}%`,
              height: "auto",
              maxWidth: "none",
            }
          : undefined
      }
      className={`h-auto w-full ${muted ? "opacity-[0.42]" : ""}`}
    />
  );

  return (
    <header className={`relative shrink-0 select-none ${className}`}>
      <h1 className="m-0 leading-none">
        {handleClick ? (
          <motion.button
            type="button"
            onClick={handleClick}
            layoutId={resolvedLayoutId}
            transition={LOGO_LAYOUT_TRANSITION}
            className={markClass}
            style={markStyle}
            aria-label="Company Goods — A Post Production Company"
          >
            {image}
          </motion.button>
        ) : (
          <MotionLink
            href="/"
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              markGoHomeNavigation();
            }}
            layoutId={resolvedLayoutId}
            transition={LOGO_LAYOUT_TRANSITION}
            className={markClass}
            style={markStyle}
            aria-label="Company Goods — A Post Production Company"
          >
            {image}
          </MotionLink>
        )}
      </h1>
    </header>
  );
}
