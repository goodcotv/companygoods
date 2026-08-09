"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CustomCursor } from "@/components/CustomCursor";

/** Site-wide custom cursor (circle / [ scroll ] / loading). */
export function SiteCursor() {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith("/studio") ?? false;

  useEffect(() => {
    if (!isStudio) return;
    delete document.documentElement.dataset.customCursor;
  }, [isStudio]);

  if (isStudio) return null;

  return <CustomCursor />;
}
