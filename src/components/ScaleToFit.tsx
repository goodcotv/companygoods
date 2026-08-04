"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ScaleToFitProps = {
  /** Design width the composition is authored at (px). */
  width: number;
  /** Optional design height. If provided, uses fixed dimensions instead of measuring. */
  height?: number;
  /** Corner radius of the stage frame in CSS pixels (does not scale with the stage). */
  radius?: number;
  /**
   * Fraction of the viewport reserved as black margin on each side (Figma bezel).
   * 0.12 → ~12% inset left/right/top/bottom.
   */
  margin?: number;
  children: ReactNode;
  className?: string;
};

/** Default site-frame corner radius (0 = sharp corners, edge-to-edge stage). */
const DEFAULT_RADIUS = 0;
/** Match Figma: modest black bezel — enough to float the stage, not shrink it. */
const DEFAULT_MARGIN = 0.01;

function computeScale(
  width: number,
  height: number,
  margin: number,
): number {
  if (height <= 0) return 0;
  const availW = window.innerWidth * (1 - 2 * margin);
  const availH = window.innerHeight * (1 - 2 * margin);
  return Math.min(availW / width, availH / Math.max(height, 1));
}

/**
 * Renders children at a fixed design width (and optionally height), then uniformly
 * scales the whole block to fit inside the viewport with black margins — like the
 * Figma frame floating in the artboard.
 *
 * All site sections share the same stage size + margin so the letterbox does not
 * jump when navigating Work / Talent / Info.
 *
 * Scale always starts at 0 on server + client (hydration-safe), then is applied in
 * useLayoutEffect before paint — never read `window` during render.
 */
export function ScaleToFit({
  width,
  height: fixedHeight,
  radius = DEFAULT_RADIUS,
  margin = DEFAULT_MARGIN,
  children,
  className = "",
}: ScaleToFitProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(fixedHeight ?? 0);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    function update() {
      if (!content) return;
      const nextHeight = fixedHeight ?? content.offsetHeight;
      setHeight(nextHeight);
      setScale(computeScale(width, nextHeight, margin));
    }

    update();

    if (!fixedHeight) {
      const ro = new ResizeObserver(update);
      ro.observe(content);
      window.addEventListener("resize", update);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", update);
      };
    }

    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
    };
  }, [width, fixedHeight, margin]);

  const stageW = width * scale;
  const stageH = height * scale;
  const ready = scale > 0 && height > 0;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center overflow-hidden bg-background ${className}`}
    >
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: stageW,
          height: stageH,
          borderRadius: radius,
          opacity: ready ? 1 : 0,
        }}
      >
        <div
          ref={contentRef}
          className="absolute top-0 left-0"
          style={{
            width,
            height: fixedHeight,
            transform: `scale(${scale || 0})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
