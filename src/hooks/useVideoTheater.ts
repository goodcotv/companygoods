"use client";

import { useLayoutEffect, useRef } from "react";

/** Locks body scroll and wires Escape to close theater mode. */
export function useVideoTheater(isOpen: boolean, onClose: () => void) {
  const scrollYRef = useRef(0);

  useLayoutEffect(() => {
    if (!isOpen) {
      delete document.documentElement.dataset.videoTheater;
      return;
    }

    document.documentElement.dataset.videoTheater = "";
    return () => {
      delete document.documentElement.dataset.videoTheater;
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    scrollYRef.current = window.scrollY;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;

      window.scrollTo({ top: scrollYRef.current, behavior: "auto" });

      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);
}
