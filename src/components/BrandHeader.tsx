import Image from "next/image";
import Link from "next/link";

type BrandHeaderProps = {
  /** `work` = small mark; `display` = large wordmark */
  variant?: "work" | "display";
  /** Soften the mark (info page). */
  muted?: boolean;
  /** Override the default width utility for the mark. */
  widthClass?: string;
  /** Skip intrinsic PNG crop (avoids clipping when the mark is sized smaller). */
  uncropped?: boolean;
  className?: string;
};

const SIZES = {
  work: {
    src: "/brand/logo-small.png",
    width: 951,
    height: 272,
    widthClass: "w-[min(100%,17.5rem)] md:w-[19rem]",
    /** Intrinsic transparent/black padding in the PNG (px at source size). */
    crop: null as null | { left: number; top: number; right: number; bottom: number },
  },
  display: {
    src: "/brand/logo-big.png",
    width: 1024,
    height: 406,
    // Figma-scale wordmark — letterforms align with the camera below
    widthClass: "w-[54rem] max-w-full",
    // Measured content bbox so "C"/"G" flush with stage content edge
    crop: { left: 50, top: 40, right: 31, bottom: 70 },
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
   * width, which collapses COMPANY/GOODS when the mark is narrower than ~54rem.
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
            style={
              activeCrop
                ? {
                    position: "absolute",
                    left: `${(-activeCrop.left / contentW) * 100}%`,
                    top: `${(-activeCrop.top / contentH) * 100}%`,
                    width: `${(width / contentW) * 100}%`,
                    height: "auto",
                    maxWidth: "none",
                    mixBlendMode: "screen" as const,
                  }
                : { mixBlendMode: "screen" as const }
            }
            className={`h-auto w-full ${muted ? "opacity-[0.42]" : ""}`}
          />
        </Link>
      </h1>
    </header>
  );
}
