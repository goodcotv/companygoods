"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CATEGORIES,
  DISCIPLINES,
  type Category,
  type Discipline,
  type Project,
} from "@/data/projects";
import {
  STAGE_LOGO_NAV_GAP_CLASS,
  STAGE_LOGO_TOP_PADDING,
  STAGE_NAV_CLEARANCE,
} from "@/lib/stage";
import { isListOverflowing } from "@/lib/cursor-hover";
import { isVideoMediaUrl, isVimeoUrl } from "@/lib/vimeo";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { BrandHeader } from "./BrandHeader";
import { AnimatedCornerBrackets } from "./AnimatedCornerBrackets";
import { MobileBrandBar } from "./MobileBrandBar";
import { MutedLoopVideo } from "./MutedLoopVideo";
import { VimeoBackground } from "./VimeoBackground";

type ListViewProps = {
  projects: Project[];
};

export function ListView({ projects }: ListViewProps) {
  const searchParams = useSearchParams();
  const isMobile = useMobileBrowseLayout();

  // Map URL slugs back to category names
  const slugToCategory: Record<string, Category> = {
    commercial: "COMMERCIAL",
    "immersive-live": "IMMERSIVE & LIVE",
    music: "MUSIC",
    beauty: "BEAUTY",
  };

  // Initialize from URL params
  const [category, setCategory] = useState<Category | null>(() => {
    const param = searchParams.get("category");
    return param ? slugToCategory[param] || null : null;
  });
  const [discipline, setDiscipline] = useState<Discipline | null>(() => {
    const param = searchParams.get("discipline");
    if (!param) return null;
    const upperParam = param.toUpperCase() as Discipline;
    return DISCIPLINES.includes(upperParam) ? upperParam : null;
  });
  const [activeId, setActiveId] = useState(projects[0]?.id);
  const [descVisible, setDescVisible] = useState(true);
  const [specialtyExpanded, setSpecialtyExpanded] = useState(false);
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", "list");

    if (category) {
      // Convert to simple slug (e.g., "IMMERSIVE & LIVE" -> "immersive-live")
      const slug = category
        .toLowerCase()
        .replace(/\s+&?\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      params.set("category", slug);
    }

    if (discipline) {
      params.set("discipline", discipline.toLowerCase());
    }

    const newUrl = `/?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [category, discipline]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (category && p.category !== category) return false;
      if (discipline && !p.disciplines.includes(discipline)) return false;
      return true;
    });
  }, [projects, category, discipline]);

  const active = filtered.find((p) => p.id === activeId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!active) return;
    if (active.id !== activeId) setActiveId(active.id);
  }, [active, activeId]);

  function selectDiscipline(d: Discipline) {
    setDiscipline((prev) => (prev === d ? null : d));
  }

  function selectProject(id: string) {
    if (id === activeId) return;
    setDescVisible(false);
    window.setTimeout(() => {
      setActiveId(id);
      setDescVisible(true);
    }, 160);
  }

  // Scroll + cursor only when content overflows the frame
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    function checkScroll() {
      if (!scrollEl) return;

      const { scrollTop } = scrollEl;
      const overflow = scrollEl.scrollHeight - scrollEl.clientHeight;
      const nextCanScroll = isListOverflowing(scrollEl);
      const threshold = 8;

      setCanScroll(nextCanScroll);
      setShowTopIndicator(nextCanScroll && scrollTop > threshold);
      setShowBottomIndicator(nextCanScroll && scrollTop < overflow - threshold);

      if (!nextCanScroll && scrollTop !== 0) {
        scrollEl.scrollTop = 0;
      }
    }

    checkScroll();
    void document.fonts?.ready.then(checkScroll);

    scrollEl.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(checkScroll)
        : null;
    resizeObserver?.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      resizeObserver?.disconnect();
    };
  }, [filtered, isMobile]);

  const activeMediaUrl = active?.image;
  const isVideo = isVideoMediaUrl(activeMediaUrl);
  const isVimeo = Boolean(activeMediaUrl && isVimeoUrl(activeMediaUrl));
  const previewStart = active?.videoPreviewStartSeconds ?? 0;

  const backgroundMedia =
    active && activeMediaUrl ? (
      <>
        <div
          className={`absolute inset-0 ${
            isMobile
              ? "scale-110 opacity-90 [filter:blur(48px)_brightness(0.85)]"
              : ""
          }`}
          style={{ zIndex: 0 }}
        >
          {isVimeo ? (
            <VimeoBackground
              key={active.id}
              src={activeMediaUrl!}
              title={active.title}
              startTime={previewStart}
              className="transition-opacity duration-500"
            />
          ) : isVideo ? (
            <MutedLoopVideo
              key={active.id}
              src={activeMediaUrl!}
              startTime={previewStart}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 1,
              }}
              className="transition-opacity duration-500"
            />
          ) : (
            <img
              key={active.id}
              src={activeMediaUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 1,
              }}
              className="transition-opacity duration-500"
            />
          )}
        </div>
        {isMobile ? null : (
          <div className="talent-media-scrim" aria-hidden="true" />
        )}
      </>
    ) : null;

  const categoryNav = (
    <nav
      className={`flex flex-wrap items-center gap-x-1 gap-y-2 tracking-[0.1em] uppercase ${
        isMobile ? "mt-4 text-[13px]" : `${STAGE_LOGO_NAV_GAP_CLASS} text-[12px]`
      }`}
      aria-label="Work categories"
    >
      {CATEGORIES.map((cat, i) => (
        <span key={cat} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <span className="text-white/55" aria-hidden>
              /
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setCategory((prev) => (prev === cat ? null : cat))}
            className={`transition-opacity ${
              category === cat
                ? "font-bold text-foreground opacity-100"
                : "text-foreground opacity-65 hover:opacity-100"
            }`}
          >
            {cat}
          </button>
        </span>
      ))}
    </nav>
  );

  const projectList = (
    <ul
      ref={scrollRef}
      {...(canScroll ? { "data-scrollable-list": true } : {})}
      className={[
        "min-h-0 flex-1 overscroll-contain",
        canScroll ? "overflow-y-auto" : "overflow-y-hidden",
        isMobile
          ? "flex flex-col gap-[14px] px-5 py-5 text-left"
          : "flex flex-col gap-[14px] py-5 pl-4 pr-4 md:gap-[18px]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {filtered.map((project) => {
        const isActive = project.id === active?.id;
        // Mobile mock: client hero + title subtitle (Grindr / CONFESSIONS…)
        const primary = isMobile
          ? project.client || project.title
          : project.title;
        const secondary = isMobile
          ? project.client
            ? project.title
            : null
          : project.client;

        return (
          <li key={project.id}>
            <Link
              href={`/work/${project.id}`}
              onMouseEnter={() => {
                if (!isMobile) selectProject(project.id);
              }}
              onTouchStart={() => selectProject(project.id)}
              onFocus={() => selectProject(project.id)}
              className={`group block w-fit max-w-full text-left transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-white/35 hover:text-foreground"
              }`}
            >
              <span className="block font-heading text-[15pt] leading-[1.05] md:text-[19pt]">
                {primary}
              </span>
              {secondary ? (
                <span className="mt-0.5 block font-display text-[11pt] font-medium uppercase leading-none md:text-[13pt]">
                  {secondary}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
      {filtered.length === 0 ? (
        <li className="text-sm text-muted">No projects match.</li>
      ) : null}
    </ul>
  );

  if (isMobile) {
    return (
      <motion.div
        className="absolute inset-0 overflow-hidden bg-background text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        {backgroundMedia}

        <div className="relative z-10 flex h-full min-h-0 flex-col pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]">
          <MobileBrandBar />
          <div className="shrink-0 px-5">{categoryNav}</div>

          {/* Side margins so brackets aren't flush with the screen edge */}
          <div
            className={[
              "relative mx-5 mt-2 flex min-h-0 flex-1 flex-col scroll-indicator-wrapper",
              showTopIndicator ? "can-scroll-up" : "",
              showBottomIndicator ? "can-scroll-down" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <AnimatedCornerBrackets inset={0} layoutId="page-corners" />

            <div
              className={`scroll-indicator top ${showTopIndicator ? "visible" : ""}`}
            >
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path
                  d="M2 8L8 2L14 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {projectList}

            <div
              className={`scroll-indicator bottom ${showBottomIndicator ? "visible" : ""}`}
            >
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path
                  d="M2 2L8 8L14 2"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
    >
      {backgroundMedia}

      <div
        className="relative flex h-full flex-col px-8"
        style={{
          zIndex: 10,
          paddingTop: STAGE_LOGO_TOP_PADDING,
          paddingBottom: STAGE_NAV_CLEARANCE,
        }}
      >
        <div className="shrink-0">
          <BrandHeader variant="display" widthClass="w-[30rem] max-w-full" />

          {categoryNav}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!specialtyExpanded && (
              <button
                type="button"
                onClick={() => setSpecialtyExpanded(true)}
                className="rounded-md bg-white/10 px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase text-white/90 transition-colors hover:bg-white/18"
              >
                SPECIALTY <span className="ml-1">+</span>
              </button>
            )}

            {specialtyExpanded && (
              <>
                {DISCIPLINES.map((d) => {
                  const on = discipline === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => selectDiscipline(d)}
                      aria-pressed={on}
                      className={`rounded-md px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase transition-colors ${
                        on
                          ? "bg-white/25 text-foreground"
                          : "bg-white/10 text-white/90 hover:bg-white/18"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setDiscipline(null);
                    setSpecialtyExpanded(false);
                  }}
                  aria-label="Clear and close specialty filters"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[13px] text-white/90 transition-colors hover:bg-white/18"
                >
                  ×
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative mt-6 min-h-0 flex-1">
          <div className="absolute inset-0 flex">
            <div
              className={[
                "relative flex w-[28rem] min-h-0 flex-col scroll-indicator-wrapper",
                canScroll ? "h-full" : "h-fit max-h-full",
                showTopIndicator ? "can-scroll-up" : "",
                showBottomIndicator ? "can-scroll-down" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <AnimatedCornerBrackets inset={0} layoutId="page-corners" />

              <div
                className={`scroll-indicator top ${showTopIndicator ? "visible" : ""}`}
              >
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path
                    d="M2 8L8 2L14 8"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {projectList}

              <div
                className={`scroll-indicator bottom ${showBottomIndicator ? "visible" : ""}`}
              >
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path
                    d="M2 2L8 8L14 2"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description panel - only when the active project has a write-up */}
      {active?.description?.trim() ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-end pr-10">
          <div
            className={`pointer-events-auto w-[24rem] transition-all duration-300 ${
              descVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            }`}
          >
            <div className="max-h-52 overflow-hidden rounded-2xl bg-panel px-6 py-5 backdrop-blur-md">
              <div
                key={active.id}
                className="h-full overflow-y-auto overscroll-contain font-sans text-[14px] leading-relaxed text-white/90"
              >
                <p>{active.description}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
