"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { BottomChrome } from "@/components/BottomChrome";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { MobileBrandBar } from "@/components/MobileBrandBar";
import { markGoHomeNavigation } from "@/components/GoHomeContext";
import { useCoarsePointerDevice } from "@/hooks/useCoarsePointerDevice";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { useScrollHoverItem } from "@/hooks/useScrollHoverItem";
import { useSequentialMediaPreload } from "@/hooks/useSequentialMediaPreload";
import { isListOverflowing } from "@/lib/cursor-hover";
import { markVideoUrlPreloaded, hideWarmMediaOverlays } from "@/lib/preload-video";
import { STAGE_LOGO_TOP_PADDING, STAGE_NAV_CLEARANCE } from "@/lib/stage";
import { isVideoMediaUrl } from "@/lib/vimeo";
import { parseTimeToSeconds } from "@/lib/parse-time";
import type { Project, TalentDetailData } from "@/sanity/types";
import { WarmHoverVideo } from "@/components/WarmHoverVideo";

const ITEM_MIN_HEIGHT =
  "min-h-[calc(15pt*1.05+0.125rem+11pt)] md:min-h-[calc(19pt*1.05+0.125rem+13pt)]";

type TalentDetailProps = {
  talent: TalentDetailData;
  projects: Project[];
};

export function TalentDetail({ talent, projects }: TalentDetailProps) {
  const router = useRouter();
  const isMobile = useMobileBrowseLayout();
  const isCoarsePointer = useCoarsePointerDevice();
  const waitForVideos = !isCoarsePointer;
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    projects[0]?._id ?? null,
  );
  const scrollRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [visibleProjectIds, setVisibleProjectIds] = useState(
    () => new Set<string>(),
  );
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  useLayoutEffect(() => {
    return () => hideWarmMediaOverlays();
  }, []);

  const setItemRef = useCallback((id: string, node: HTMLLIElement | null) => {
    if (node) itemRefs.current.set(id, node);
    else itemRefs.current.delete(id);
  }, []);

  const activeProject =
    projects.find((project) => project._id === activeProjectId) ?? projects[0];
  const mediaVideoUrl = activeProject?.videoUrl;
  const mediaImageUrl = activeProject?.imageUrl || talent.imageUrl;
  const previewStart =
    activeProject?.videoPreviewStartSeconds ??
    parseTimeToSeconds(activeProject?.videoPreviewStart) ??
    0;

  const preloadItems = useMemo(
    () =>
      projects.map((project) => ({
        id: project._id,
        videoUrl: isVideoMediaUrl(project.videoUrl)
          ? project.videoUrl
          : undefined,
        startTime:
          project.videoPreviewStartSeconds ??
          parseTimeToSeconds(project.videoPreviewStart) ??
          0,
      })),
    [projects],
  );

  const allProjectIds = useMemo(
    () => new Set(projects.map((project) => project._id)),
    [projects],
  );

  const listItemIds = useMemo(
    () => projects.map((project) => project._id),
    [projects],
  );

  const activateFromScroll = useCallback((id: string) => {
    setActiveProjectId((prev) => (prev === id ? prev : id));
  }, []);

  useScrollHoverItem({
    enabled: isMobile,
    scrollRef,
    itemRefs,
    itemIds: listItemIds,
    onActivate: activateFromScroll,
  });

  const effectiveVisibleIds = useMemo(() => {
    if (!waitForVideos) return allProjectIds;
    if (visibleProjectIds.size > 0) return visibleProjectIds;
    return new Set(projects.slice(0, 6).map((project) => project._id));
  }, [waitForVideos, projects, visibleProjectIds, allProjectIds]);

  const priorityVideoUrl = isVideoMediaUrl(mediaVideoUrl)
    ? mediaVideoUrl
    : undefined;

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

    if (next.size === 0 && projects.length > 0) {
      for (const project of projects.slice(0, 6)) {
        next.add(project._id);
      }
    }

    setVisibleProjectIds((prev) => {
      const projectIds = new Set(projects.map((project) => project._id));
      const merged = new Set<string>();
      for (const id of prev) {
        if (projectIds.has(id)) merged.add(id);
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
  }, [projects, waitForVideos]);

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
  }, [projects, syncVisibleItems, waitForVideos]);

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

  const markActivePreloaded = useCallback(() => {
    if (priorityVideoUrl) {
      markVideoUrlPreloaded(priorityVideoUrl, previewStart);
    }
  }, [priorityVideoUrl, previewStart]);

  const loadingProjectId =
    waitForVideos && readyProjectIds
      ? projects.find(
          (project) =>
            effectiveVisibleIds.has(project._id) &&
            !readyProjectIds.has(project._id),
        )?._id
      : undefined;

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
  }, [projects]);

  const backgroundMedia = (
    <>
      <div className="talent-media">
        {mediaVideoUrl ? (
          <WarmHoverVideo
            src={mediaVideoUrl}
            startTime={previewStart}
            playing
            className="h-full w-full"
            onPreviewReady={(ready) => {
              if (ready) markActivePreloaded();
            }}
          />
        ) : mediaImageUrl ? (
          <Image
            key={activeProject?._id ?? "portrait"}
            src={mediaImageUrl}
            alt={activeProject ? activeProject.title : talent.name}
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        ) : null}
      </div>
      {!isMobile ? (
        <div className="talent-media-scrim" aria-hidden="true" />
      ) : null}
    </>
  );

  const projectList = (
    <ul
      ref={scrollRef}
      {...(canScroll ? { "data-scrollable-list": true } : {})}
      className={[
        "talent-detail-projects",
        canScroll ? "is-scrollable" : "",
        isMobile ? "talent-detail-projects--mobile" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {projects.map((project) => {
        const isReady =
          !waitForVideos ||
          !readyProjectIds ||
          readyProjectIds.has(project._id);
        const isVisible =
          !waitForVideos || effectiveVisibleIds.has(project._id);
        const isLoading = project._id === loadingProjectId;

        if (waitForVideos && !isReady && !isVisible) {
          return (
            <li
              key={project._id}
              ref={(node) => setItemRef(project._id, node)}
              data-project-id={project._id}
              className={ITEM_MIN_HEIGHT}
              aria-hidden
            />
          );
        }

        if (!isReady && isLoading) {
          return (
            <li
              key={project._id}
              ref={(node) => setItemRef(project._id, node)}
              data-project-id={project._id}
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
              key={project._id}
              ref={(node) => setItemRef(project._id, node)}
              data-project-id={project._id}
              className={ITEM_MIN_HEIGHT}
              aria-hidden
            />
          );
        }

        const isActive = project._id === activeProject?._id;
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
            key={project._id}
            ref={(node) => setItemRef(project._id, node)}
            data-project-id={project._id}
            className="animate-[fade-in_0.25s_ease-out]"
          >
            <Link
              href={`/work/${project.slug}`}
              className={`group block w-fit max-w-full text-left transition-colors ${
                isActive
                  ? "text-foreground"
                  : isMobile
                    ? "text-white/35"
                    : "text-white/35 hover:text-foreground"
              }`}
              onMouseEnter={() => {
                if (!isMobile) setActiveProjectId(project._id);
              }}
              onFocus={() => {
                if (!isMobile) setActiveProjectId(project._id);
              }}
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
    </ul>
  );

  function openSiteMenu() {
    window.sessionStorage.setItem("openMobileMenu", "1");
    router.push("/?section=talent");
  }

  function goToHome() {
    markGoHomeNavigation();
    router.push("/");
  }

  if (isMobile) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-transparent text-foreground">
        {backgroundMedia}

        <div className="relative z-10 flex h-full min-h-0 flex-col pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]">
          <MobileBrandBar onClick={goToHome} />

          <div className="flex min-h-0 flex-1 flex-col px-5">
            <div className="mb-4 flex shrink-0 items-baseline justify-between gap-4">
              <h1 className="font-sans text-[13px] font-normal tracking-[0.18em] uppercase text-white">
                {talent.name}
              </h1>
              <button
                type="button"
                onClick={() => router.back()}
                className="font-sans text-[15px] font-normal text-white transition-opacity hover:opacity-60"
                aria-label="Close"
              >
                X
              </button>
            </div>

            {projects.length > 0 ? (
              <div
                className={[
                  "talent-list-slot",
                  canScroll ? "is-scrollable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <AnimatedCornerBrackets inset={0} layoutId="page-corners" />
                <div
                  className={[
                    "talent-list-frame scroll-indicator-wrapper",
                    showTopIndicator ? "can-scroll-up" : "",
                    showBottomIndicator ? "can-scroll-down" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
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
            ) : null}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <BottomChrome
            position="inline"
            activeHref="/talent"
            onMenuOpen={openSiteMenu}
            className="pointer-events-auto w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-transparent text-foreground">
      {backgroundMedia}

      <div
        className="absolute top-0 left-0 z-20 px-8"
        style={{ paddingTop: STAGE_LOGO_TOP_PADDING }}
      >
        <BrandHeader
          variant="work"
          widthClass="w-[30rem] max-w-full"
          onClick={goToHome}
        />
      </div>

      <div
        className="absolute left-12 top-[11.5rem] z-10 flex min-h-0 flex-col"
        style={{ bottom: STAGE_NAV_CLEARANCE }}
      >
        <div className="mb-6 flex shrink-0 items-baseline gap-4">
          <h1 className="font-sans text-[11px] font-normal tracking-[0.18em] uppercase text-white">
            {talent.name}
          </h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="font-sans text-[13px] font-normal text-white transition-opacity hover:opacity-60"
            aria-label="Close"
          >
            x
          </button>
        </div>

        {projects.length > 0 && (
          <div
            className={[
              "talent-list-slot",
              canScroll ? "is-scrollable" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <AnimatedCornerBrackets inset={0} layoutId="page-corners" />
            <div
              className={[
                "talent-list-frame scroll-indicator-wrapper",
                showTopIndicator ? "can-scroll-up" : "",
                showBottomIndicator ? "can-scroll-down" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
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
        )}
      </div>

      <BottomChrome
        position="inline"
        activeHref="/talent"
        className="absolute right-8 bottom-7 z-50 justify-end"
      />
    </div>
  );
}
