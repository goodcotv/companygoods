"use client";

import { motion } from "framer-motion";

type AnimatedCornerBracketsProps = {
  className?: string;
  inset?: number;
  layoutId?: string;
};

/**
 * Animated camera-style viewfinder corners with smooth transitions.
 * Uses Framer Motion's layout animations to morph between different layouts.
 */
export function AnimatedCornerBrackets({
  className = "",
  inset = 10,
  layoutId = "camera-corners",
}: AnimatedCornerBracketsProps) {
  const arm = 22;
  const cut = 4;
  const stroke = 1;
  const pad = stroke / 2;
  const size = arm + cut + pad;

  const corners = [
    {
      key: "tl",
      style: { top: inset, left: inset },
      d: `M ${size} ${pad} H ${cut + pad} L ${pad} ${cut + pad} V ${size}`,
    },
    {
      key: "tr",
      style: { top: inset, right: inset },
      d: `M ${pad} ${pad} H ${arm} L ${size - pad} ${cut + pad} V ${size}`,
    },
    {
      key: "bl",
      style: { bottom: inset, left: inset },
      d: `M ${pad} ${pad} V ${arm} L ${cut + pad} ${size - pad} H ${size}`,
    },
    {
      key: "br",
      style: { bottom: inset, right: inset },
      d: `M ${size - pad} ${pad} V ${arm} L ${arm} ${size - pad} H ${pad}`,
    },
  ] as const;

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
      {corners.map(({ key, style, d }) => (
        <svg
          key={key}
          className="absolute overflow-visible"
          width={size}
          height={size}
          style={style}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
        >
          <path
            d={d}
            stroke="var(--frame)"
            strokeWidth={stroke}
            strokeLinecap="square"
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </motion.div>
  );
}
