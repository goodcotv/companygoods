"use client";

import { motion } from "framer-motion";
import {
  BRACKET_STROKE,
  FRAME_BRACKET,
  buildCornerBrackets,
  cornerPosition,
  type CornerBracketGeometry,
} from "@/lib/corner-brackets";

type AnimatedCornerBracketsProps = {
  className?: string;
  inset?: number;
  layoutId?: string;
  geometry?: CornerBracketGeometry;
};

/**
 * Animated camera-style viewfinder corners with smooth transitions.
 * Uses Framer Motion's layout animations to morph between different layouts.
 */
export function AnimatedCornerBrackets({
  className = "",
  inset = 10,
  layoutId = "camera-corners",
  geometry = FRAME_BRACKET,
}: AnimatedCornerBracketsProps) {
  const { size, corners } = buildCornerBrackets(geometry);

  return (
    <motion.div
      layoutId={layoutId}
      className={`pointer-events-none absolute inset-0 z-50 ${className}`}
      aria-hidden
      transition={{
        layout: {
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
    >
      {corners.map(({ key, d }) => (
        <svg
          key={key}
          className="absolute overflow-visible"
          width={size}
          height={size}
          style={cornerPosition(key, inset)}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
        >
          <path
            d={d}
            stroke="var(--frame)"
            strokeWidth={BRACKET_STROKE}
            strokeLinecap="square"
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </motion.div>
  );
}
