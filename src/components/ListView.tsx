"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { markVideoUrlPreloaded } from "@/lib/preload-video";
import { isVideoMediaUrl, isVimeoUrl } from "@/lib/vimeo";
import { useCoarsePointerDevice } from "@/hooks/useCoarsePointerDevice";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { useSequentialMediaPreload } from "@/hooks/useSequentialMediaPreload";
import { BrandHeader } from "./BrandHeader";
import { AnimatedCornerBrackets } from "./AnimatedCornerBrackets";
import { MobileBrandBar } from "./MobileBrandBar";
import { MutedLoopVideo } from "./MutedLoopVideo";
import { VimeoBackground } from "./VimeoBackground";

const ITEM_MIN_HEIGHT =
  "min-h-[calc(15pt*1.05+0.125rem+11pt)] md:min-h-[calc(19pt*1.05+0.125rem+13pt)]";

type ListViewProps = {
  projects: Project[];
};

export function ListView({ projects }: ListViewProps) {
  const searchParams = useSearchParams();
  const isMobile = useMobileBrowseLayout();
  const isCoarsePointer = useCoarsePointerDevice();
  const waitForVideos = !isCoarsePointer;

  // Map URL slugs back to category names
  const slugToCategory: Record<string, Category> = {
    commercial: "COMMERCIAL",
    "immersive-live": "IMMERSIVE & LIVE",
    music: "MUSIC",
    beauty: "BEAUTY",
  };

  // Initialize from URL params; default to Commercial when none is set
  const [category, setCategory] = useState<Category | null>(() => {
    const param = searchParams.get("category");
    if (!param) return "COMMERCIAL";
    return slugToCategory[param] || "COMMERCIAL";
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
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [visibleProjectIds, setVisibleProjectIds] = useState(
    () => new Set<string>(),
  );
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  const setItemRef = useCallback((id: string, node: HTMLLIElement | null) => {
    if (node) itemRefs.current.set(id, node);
    else itemRefs.current.delete(id);
  }, []);

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

  const preloadItems = useMemo(
    () =>
      filtered.map((project) => ({
        id: project.id,
        videoUrl: isVideoMediaUrl(project.image) ? project.image : undefined,
        startTime: project.videoPreviewStartSeconds ?? 0,
      })),
    [filtered],
  );

  const allProjectIds = useMemo(
    () => new Set(filtered.map((project) => project.id)),
    [filtered],
  );

  const effectiveVisibleIds = useMemo(() => {
    if (!waitForVideos) return allProjectIds;
    if (visibleProjectIds.size > 0) return visibleProjectIds;
    return new Set(filtered.slice(0, 6).map((project) => project.id));
  }, [waitForVideos, filtered, visibleProjectIds, allProjectIds]);

  const priorityVideoUrl =
    active?.image && isVideoMediaUrl(active.image) ? active.image : undefined;
  const previewStart = active?.videoPreviewStartSeconds ?? 0;

  const { readyIds: readyProjectIds } = useSequentialMediaPreload(
    preloadItems,
    effectiveVisibleIds,
    priorityVideoUrl,
    waitForVideos,
    previewStart,
  );

  const syncVisibleItems = useCallback(() => {
    const root = scrollRef.current;
    if (!root || !waitForVideos) return;

    const rootRect = root.getBoundingClientRect();
    const next = new Set<string>();

    itemRefs.current.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < rootRect.bottom + 120 && rect.bottom > rootRect.top - 120) {
        const id = element.getAttribute("data-project-id");
        if (id) next.add(id);
      }
    });

    if (next.size === 0 && filtered.length > 0) {
      for (const project of filtered.slice(0, 6)) {
        next.add(project.id);
      }
    }

    setVisibleProjectIds((prev) => {
      // Grow-only within the current filter so reveal/layout shifts can't
      // shrink visibility, flip visibilityKey, and retrigger the preload pump.
      const filteredIds = new Set(filtered.map((project) => project.id));
      const merged = new Set<string>();
      for (const id of prev) {
        if (filteredIds.has(id)) merged.add(id);
      }
      for (const id of next) merged.add(id);

      if (
        merged.size === prev.size &&
        [...merged].every((id) => prev.has(id))
      ) {
        return prev;
      }
      return merged;
    });
  }, [filtered, waitForVideos]);

  useLayoutEffect(() => {
    if (!waitForVideos || !scrollRef.current) return;

    syncVisibleItems();

    const root = scrollRef.current;
    const observer = new IntersectionObserver(() => syncVisibleItems(), {
      root,
      rootMargin: "120px 0px",
      threshold: 0,
    });

    itemRefs.current.forEach((element) => observer.observe(element));

    const resizeObserver = new ResizeObserver(() => syncVisibleItems());
    resizeObserver.observe(root);

    const frame = requestAnimationFrame(() => syncVisibleItems());

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [filtered, syncVisibleItems, waitForVideos]);

  useEffect(() => {
    if (!waitForVideos) return;
    syncVisibleItems();
  }, [readyProjectIds, syncVisibleItems, waitForVideos]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !waitForVideos) return;
    root.addEventListener("scroll", syncVisibleItems, { passive: true });
    return () => root.removeEventListener("scroll", syncVisibleItems);
  }, [syncVisibleItems, waitForVideos]);

  useEffect(() => {
    if (!active) return;
    if (active.id !== activeId) setActiveId(active.id);
  }, [active, activeId]);

  const markActivePreloaded = useCallback(() => {
    if (priorityVideoUrl) {
      markVideoUrlPreloaded(priorityVideoUrl, previewStart);
    }
  }, [priorityVideoUrl, previewStart]);

  const loadingProjectId =
    waitForVideos && readyProjectIds
      ? filtered.find(
          (project) =>
            effectiveVisibleIds.has(project.id) &&
            !readyProjectIds.has(project.id),
        )?.id
      : undefined;

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
              onReady={markActivePreloaded}
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
              onReady={markActivePreloaded}
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
        const isReady =
          !waitForVideos ||
          !readyProjectIds ||
          readyProjectIds.has(project.id);
        const isVisible =
          !waitForVideos || effectiveVisibleIds.has(project.id);
        const isLoading = project.id === loadingProjectId;

        if (waitForVideos && !isReady && !isVisible) {
          return (
            <li
              key={project.id}
              ref={(node) => setItemRef(project.id, node)}
              data-project-id={project.id}
              className={ITEM_MIN_HEIGHT}
              aria-hidden
            />
          );
        }

        if (!isReady && isLoading) {
          return (
            <li
              key={project.id}
              ref={(node) => setItemRef(project.id, node)}
              data-project-id={project.id}
              aria-busy="true"
            >
              <div
                className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"
                aria-hidden
              />
              <span className="sr-only">Loading {project.title}</span>
            </li>
          );
        }

        if (!isReady) {
          return (
            <li
              key={project.id}
              ref={(node) => setItemRef(project.id, node)}
              data-project-id={project.id}
              className={ITEM_MIN_HEIGHT}
              aria-hidden
            />
          );
        }

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
          <li
            key={project.id}
            ref={(node) => setItemRef(project.id, node)}
            data-project-id={project.id}
            className="animate-[fade-in_0.25s_ease-out]"
          >
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
          <BrandHeader variant="work" widthClass="w-[30rem] max-w-full" />

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
