"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { BrandHeader } from "./BrandHeader";
import { HoverStillBackdrop } from "./HoverStillBackdrop";

/** Matches MobileBrandBar inset (`px-1.5` + safe-area top). */
const LOGO_TOP = {
  top: "max(0.875rem, env(safe-area-inset-top))",
  width: "calc(100% - 0.75rem)",
  maxWidth: "none",
} as const;
/** Settled home mark — centered over the intro clip. */
const LOGO_CENTER = {
  top: "50%",
  width: "88vw",
  maxWidth: "560px",
} as const;

export const LOGO_HOME_SLIDE_MS = 450;

type LogoHomeTransitionProps = {
  videoUrl?: string;
  /** Full-screen intro clip. Off when the landing video is already playing. */
  showBackdrop?: boolean;
  onComplete: () => void;
};

export function LogoHomeTransition({
  videoUrl,
  showBackdrop = true,
  onComplete,
}: LogoHomeTransitionProps) {
  const [portalReady, setPortalReady] = useState(false);
  const [atCenter, setAtCenter] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const finishedRef = useRef(false);

  useLayoutEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    portalRef.current = el;
    setPortalReady(true);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  useLayoutEffect(() => {
    if (!portalReady) return;
    setAtCenter(false);
    const startTimer = window.setTimeout(() => setAtCenter(true), 80);
    return () => window.clearTimeout(startTimer);
  }, [portalReady]);

  useEffect(() => {
    if (!atCenter || finishedRef.current) return;
    const timer = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onCompleteRef.current();
    }, LOGO_HOME_SLIDE_MS + 80);
    return () => window.clearTimeout(timer);
  }, [atCenter]);

  if (!portalReady || !portalRef.current) return null;

  const size = atCenter ? LOGO_CENTER : LOGO_TOP;
  const logoStyle: CSSProperties = {
    position: "fixed",
    left: "50%",
    height: "auto",
    zIndex: 10110,
    width: size.width,
    maxWidth: size.maxWidth,
    transition: `top ${LOGO_HOME_SLIDE_MS}ms ease-out, transform ${LOGO_HOME_SLIDE_MS}ms ease-out, width ${LOGO_HOME_SLIDE_MS}ms ease-out, max-width ${LOGO_HOME_SLIDE_MS}ms ease-out`,
    ...(atCenter
      ? { top: LOGO_CENTER.top, transform: "translate(-50%, -50%)" }
      : { top: LOGO_TOP.top, transform: "translate(-50%, 0)" }),
  };

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[10100]">
      {showBackdrop ? (
        <div className="absolute inset-0 bg-black">
          <HoverStillBackdrop
            videoUrl={videoUrl}
            className="absolute inset-0"
          />
        </div>
      ) : null}
      <div style={logoStyle}>
        <BrandHeader
          variant="work"
          widthClass="w-full"
          layoutId={false}
          onClick={() => {}}
        />
      </div>
    </div>,
    portalRef.current,
  );
}
