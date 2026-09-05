"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";

const SLOT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type TalentListSlotProps = {
  canScroll: boolean;
  children: ReactNode;
};

/**
 * Hug-wrap camera frame. Height is interpolated in pixels so the brackets
 * (absolute inset-0) shrink/grow with the box — no layoutId scale projection.
 */
export function TalentListSlot({ canScroll, children }: TalentListSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const allowAnim = useRef(false);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const content = contentRef.current;
    if (!slot) return;

    const measure = () => {
      const max = slot.parentElement?.clientHeight;
      const next = canScroll
        ? max
        : content
          ? Math.min(content.offsetHeight, max ?? content.offsetHeight)
          : undefined;
      if (next == null) return;

      setHeight((prev) => {
        if (prev != null && prev !== next) allowAnim.current = true;
        return prev === next ? prev : next;
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (slot.parentElement) ro.observe(slot.parentElement);
    if (content) ro.observe(content);

    return () => ro.disconnect();
  }, [canScroll]);

  return (
    <motion.div
      ref={slotRef}
      className={["talent-list-slot", canScroll ? "is-scrollable" : ""]
        .filter(Boolean)
        .join(" ")}
      initial={false}
      animate={height != null ? { height } : undefined}
      transition={{
        height: {
          duration: allowAnim.current ? 0.7 : 0,
          ease: SLOT_EASE,
        },
      }}
    >
      <AnimatedCornerBrackets
        inset={0}
        layoutId="page-corners"
        layout="position"
      />
      <div
        ref={contentRef}
        className={
          canScroll
            ? "flex h-full min-h-0 w-fit max-w-full flex-col"
            : "w-fit max-w-full"
        }
      >
        {children}
      </div>
    </motion.div>
  );
}
