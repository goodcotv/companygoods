"use client";

import { LayoutGroup } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Persistent shared-layout scope across App Router navigations
 * (home shell ↔ project / talent detail pages).
 */
export function SharedLayout({ children }: { children: ReactNode }) {
  return <LayoutGroup>{children}</LayoutGroup>;
}
