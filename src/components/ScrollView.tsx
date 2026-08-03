"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { Project, ScrollSubtitleSpan } from "@/data/projects";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/stage";
import { BottomChrome, type ViewMode } from "./BottomChrome";
import { BrandHeader } from "./BrandHeader";
import { MediaViewport } from "./MediaViewport";
import { ScaleToFit } from "./ScaleToFit";

type ScrollViewProps = {
  projects: Project[];
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  introVideoUrl?: string;
  onNavigate?: (section: "work" | "talent" | "info") => void;
};

/** Camera frame height inside the stage (16:9). */
const MEDIA_HEIGHT = 340;

/** Sentinel index for the site intro / main video (from Post Site Settings). */
const INTRO_INDEX = -1;
/** Ignore further wheel/touch input while a step is in progress. */
const STEP_LOCK_MS = 650;
const WHEEL_THRESHOLD = 12;
const TOUCH_THRESHOLD = 36;

function LatestLabel() {
  return (
    <div className="flex items-center gap-2.5 text-[12px] tracking-[0.14em] text-foreground uppercase">
      <span className="inline-flex flex-col gap-[1px]" aria-hidden>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1 4L4 1L7 4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </span>
      Latest Projects
    </div>
  );
}

function SubtitleLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "underline underline-offset-4 decoration-white/70";
  const isInternal = href.startsWith("/");

  if (isInternal) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function SubtitleLine({ spans }: { spans: ScrollSubtitleSpan[] }) {
  return (
    <p>
      {spans.map((span, index) =>
        span.href ? (
          <SubtitleLink key={`${span.text}-${index}`} href={span.href}>
            {span.text}
          </SubtitleLink>
        ) : (
          <span key={`${span.text}-${index}`}>{span.text}</span>
        ),
      )}
    </p>
  );
}

function ProjectCredits({ project }: { project: Project }) {
  const customLines = project.scrollSubtitles;

  return (
    <div className="mt-4 max-w-sm animate-fade-up">
      <h2 className="font-display text-[1.85rem] font-medium leading-[1.15] tracking-[-0.02em] text-foreground">
        {project.client} — {project.title}
      </h2>
      <div className="mt-3 space-y-0.5 font-sans text-[12px] leading-snug tracking-[0.06em] text-foreground uppercase">
        {customLines && customLines.length > 0 ? (
          customLines.map((spans, index) => (
            <SubtitleLine key={index} spans={spans} />
          ))
        ) : (
          <>
            {project.roles.map((role) => (
              <p key={role}>{role}</p>
            ))}
            {project.lead ? (
              <p>
                {project.lead.label}:{" "}
                <span className="underline underline-offset-4 decoration-white/70">
                  {project.lead.name}
                </span>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function ScrollView({
  projects,
  view,
  onViewChange,
  introVideoUrl,
  onNavigate,
}: ScrollViewProps) {
  const [activeIndex, setActiveIndex] = useState(INTRO_INDEX);
  const indexRef = useRef(INTRO_INDEX);
  const lockedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  const lastIndex = projects.length - 1;
  const isIntro = activeIndex === INTRO_INDEX;
  const active = isIntro ? null : (projects[activeIndex] ?? projects[0]);

  useEffect(() => {
    indexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, []);

  useEffect(() => {
    function step(direction: 1 | -1) {
      if (lockedRef.current) return;

      const next = Math.max(
        INTRO_INDEX,
        Math.min(lastIndex, indexRef.current + direction),
      );
      if (next === indexRef.current) return;

      lockedRef.current = true;
      indexRef.current = next;
      setActiveIndex(next);

      window.setTimeout(() => {
        lockedRef.current = false;
      }, STEP_LOCK_MS);
    }

    function onWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
      event.preventDefault();
      step(event.deltaY > 0 ? 1 : -1);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        indexRef.current = INTRO_INDEX;
        setActiveIndex(INTRO_INDEX);
      } else if (event.key === "End") {
        event.preventDefault();
        indexRef.current = lastIndex;
        setActiveIndex(lastIndex);
      }
    }

    function onTouchStart(event: TouchEvent) {
      touchStartY.current = event.touches[0]?.clientY ?? null;
    }

    function onTouchEnd(event: TouchEvent) {
      const startY = touchStartY.current;
      touchStartY.current = null;
      if (startY == null) return;

      const endY = event.changedTouches[0]?.clientY;
      if (endY == null) return;

      const delta = startY - endY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;
      step(delta > 0 ? 1 : -1);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [lastIndex]);

  return (
    <motion.div
      className="flex flex-col bg-background px-8 pb-8 pt-4 text-foreground"
      style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
    >
      {/* Logo letterforms share the same left edge as the camera */}
      <BrandHeader variant="display" />

        {/*
          Media + sidebar share one row so the navbar sits on the camera's
          baseline (Figma: nav bottom = video bottom).
          Wrapped in flex-1 container to match info page max-bottom constraint.
        */}
        <div className="mt-5 min-h-0 flex-1">
        <div className="flex min-h-0 items-stretch gap-12">
          <div
            className="relative shrink-0"
            style={{
              height: MEDIA_HEIGHT,
              width: (MEDIA_HEIGHT * 16) / 9,
            }}
          >
            <div
              className={`absolute inset-0 transition-opacity duration-500 ${
                isIntro ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!isIntro}
            >
              <MediaViewport
                title="Intro Video"
                className="h-full w-full"
                src={introVideoUrl}
                type="video"
                cornersLayoutId="page-corners"
              />
            </div>

            {projects.map((project, i) => {
              const mediaSrc = project.image;
              const mediaType =
                project.image?.includes(".mp4") ||
                project.image?.includes("video")
                  ? "video"
                  : "image";
              const on = !isIntro && i === activeIndex;

              return (
                <div
                  key={project.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    on ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  aria-hidden={!on}
                >
                  <MediaViewport
                    title={project.title}
                    className="h-full w-full"
                    src={mediaSrc}
                    type={mediaType}
                    cornersLayoutId="page-corners"
                  />
                </div>
              );
            })}
          </div>

          <div
            className="flex min-w-0 flex-1 flex-col"
            style={{ height: MEDIA_HEIGHT }}
          >
            <LatestLabel />
            {!isIntro && active ? <ProjectCredits project={active} /> : null}
          </div>
        </div>
        </div>
      </motion.div>
  );
}
