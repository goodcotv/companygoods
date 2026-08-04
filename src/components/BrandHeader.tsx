import Image from "next/image";
import Link from "next/link";

type BrandHeaderProps = {
  /** `work` = small mark; `display` = large wordmark */
  variant?: "work" | "display";
  /** Soften the mark (info page). */
  muted?: boolean;
  /** Override the default width utility for the mark. */
  widthClass?: string;
  /** Skip intrinsic viewBox crop (avoids clipping when the mark is sized smaller). */
  uncropped?: boolean;
  className?: string;
};

const SIZES = {
  work: {
    src: "/brand/logo-small.svg",
    width: 699,
    height: 277,
    widthClass: "w-[min(100%,17.5rem)] md:w-[19rem]",
    /** Intrinsic padding in the SVG viewBox (px at source size). */
    crop: null as null | { left: number; top: number; right: number; bottom: number },
  },
  display: {
    src: "/brand/logo-big.svg",
    width: 699,
    height: 277,
    // Keep in sync with DISPLAY_LOGO_WIDTH in src/lib/stage.ts
    widthClass: "w-[900px] max-w-full",
    // Measured content bbox so "C"/"G" flush with camera left edge
    crop: { left: 34, top: 41, right: 21, bottom: 55 },
  },
} as const;

export function BrandHeader({
  variant = "work",
  muted = false,
  widthClass: widthClassProp,
  uncropped = false,
  className = "",
}: BrandHeaderProps) {
  const { src, width, height, widthClass, crop } = SIZES[variant];
  const markWidth = widthClassProp ?? widthClass;
  const activeCrop = uncropped ? null : crop;

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

  return (
    <header className={`relative shrink-0 select-none ${className}`}>
      <h1 className="m-0 leading-none">
        <Link
          href="/"
          className={`relative block text-inherit no-underline ${markWidth} ${
            activeCrop ? "overflow-hidden" : ""
          }`}
          style={
            activeCrop
              ? { aspectRatio: `${contentW} / ${contentH}` }
              : undefined
          }
          aria-label="Company Goods — A Post Production Company"
        >
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
        </Link>
      </h1>
    </header>
  );
}
