import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { Project, ScrollSubtitleSpan } from "@/data/projects";
import {
  DISPLAY_LOGO_WIDTH,
  STAGE_HEIGHT,
  STAGE_LOGO_TOP_PADDING,
  STAGE_NAV_CLEARANCE,
  STAGE_WIDTH,
} from "@/lib/stage";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { BrandHeader } from "./BrandHeader";
import { MediaViewport } from "./MediaViewport";
import { MobileBrandBar } from "./MobileBrandBar";
import { isVideoMediaUrl } from "@/lib/vimeo";

type ScrollViewProps = {
  projects: Project[];
  introVideoUrl?: string;
};

/** Sentinel index for the site intro / main video (from Post Site Settings). */
const INTRO_INDEX = -1;
/** Ignore further wheel/touch input while a step is in progress. */
const STEP_LOCK_MS = 650;
const WHEEL_THRESHOLD = 12;
const TOUCH_THRESHOLD = 36;

function LatestLabel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 tracking-[0.14em] text-foreground uppercase whitespace-nowrap ${
        className.includes("text-[") ? className : `text-[12px] ${className}`
      }`}
    >
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
    <div className="mt-4 animate-fade-up">
      <h2 className="font-display text-[1.85rem] font-medium leading-[1.15] tracking-[-0.02em] text-foreground">
        <Link
          href={`/work/${project.id}`}
          className="transition-opacity hover:opacity-70"
        >
          {project.title} — {project.client}
        </Link>
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

export function ScrollView({ projects, introVideoUrl }: ScrollViewProps) {
  const isMobile = useMobileBrowseLayout();
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

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      // Always clear — restoring prior inline values can leave overflow locked on /work/[slug].
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
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

  const mediaLayers = (
    <>
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
          corners={!isMobile}
          radius={isMobile ? 24 : 16}
        />
      </div>

      {projects.map((project, i) => {
        const mediaSrc = project.image;
        const mediaType = isVideoMediaUrl(mediaSrc) ? "video" : "image";
        const on = !isIntro && i === activeIndex;

        return (
          <Link
            key={project.id}
            href={`/work/${project.id}`}
            aria-label={`Open ${project.title}`}
            className={`absolute inset-0 transition-opacity duration-500 ${
              on ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!on}
            tabIndex={on ? 0 : -1}
          >
            <MediaViewport
              title={project.title}
              className="h-full w-full"
              src={mediaSrc}
              type={mediaType}
              cornersLayoutId="page-corners"
              corners={!isMobile}
              radius={isMobile ? 24 : 16}
            />
            {/* Catch clicks above video/iframe so navigation always works */}
            <span className="absolute inset-0 z-10" aria-hidden />
          </Link>
        );
      })}
    </>
  );

  if (isMobile) {
    return (
      <motion.div
        data-scroll-cursor
        className="absolute inset-0 flex flex-col bg-background text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <MobileBrandBar />

        <div className="relative mt-4 min-h-0 flex-1 px-3 pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]">
          <div className="relative h-full w-full overflow-hidden rounded-[24px]">
            {mediaLayers}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4">
              <LatestLabel className="text-[14px] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      data-scroll-cursor
      className="absolute inset-0 flex flex-col bg-background px-8 text-foreground"
      style={{
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        paddingTop: STAGE_LOGO_TOP_PADDING,
        // Camera bottom sits on the nav's top edge
        paddingBottom: STAGE_NAV_CLEARANCE,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
    >
      {/* Wordmark: C/G share the camera's left edge */}
      <div className="shrink-0" style={{ width: DISPLAY_LOGO_WIDTH }}>
        <BrandHeader variant="display" widthClass="w-full" />
      </div>

      {/*
        Fills remaining height above the nav. Camera is 16:9 at full row
        height so its bottom edge = top of BottomChrome.
        Latest Projects + credits share the sidebar's left edge.
      */}
      <div className="mt-3 flex min-h-0 flex-1 items-end gap-8">
        <div
          className="relative h-full shrink-0"
          style={{ aspectRatio: "16 / 9" }}
        >
          {mediaLayers}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start self-start">
          <LatestLabel />
          {!isIntro && active ? (
            <ProjectCredits key={active.id} project={active} />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
