"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BrandHeader } from "@/components/BrandHeader";
import { MobileBrandBar } from "@/components/MobileBrandBar";
import { TalentListSlot } from "@/components/talent/TalentListSlot";
import { CATEGORIES, type TalentCategory } from "@/data/talent";
import { useCoarsePointerDevice } from "@/hooks/useCoarsePointerDevice";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { SCROLL_SETTLE_MS, useScrollHoverItem } from "@/hooks/useScrollHoverItem";
import { useSequentialMediaPreload } from "@/hooks/useSequentialMediaPreload";
import { isListOverflowing } from "@/lib/cursor-hover";
import { preloadNeighborProjectStills } from "@/lib/hover-still";
import { markVideoUrlPreloaded, hideWarmMediaOverlays } from "@/lib/preload-video";
import {
  STAGE_LOGO_NAV_GAP_CLASS,
  STAGE_LOGO_TOP_PADDING,
  STAGE_NAV_CLEARANCE,
} from "@/lib/stage";
import { isVideoMediaUrl } from "@/lib/vimeo";
import { parseTimeToSeconds } from "@/lib/parse-time";
import type { PostDiscipline, PostWorker } from "@/sanity/types";
import { textNav } from "@/lib/typography";
import { HoverStillBackdrop } from "@/components/HoverStillBackdrop";

const ITEM_MIN_HEIGHT = "min-h-[calc(21pt*1)]";
const STILL_PRELOAD_MARGIN_PX = 400;

const categoryToDiscipline: Record<TalentCategory, PostDiscipline> = {
  editors: "edit",
  colorists: "color",
  sound: "sound",
  vfx: "vfx",
};

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((item) => item.id));

type TalentRosterProps = {
  workers: PostWorker[];
};

function parseCategory(value: string | null): TalentCategory {
  if (value && VALID_CATEGORIES.has(value)) {
    return value as TalentCategory;
  }
  return "editors";
}

function roleSortOrder(worker: PostWorker, category: TalentCategory): number {
  const specific = worker.roleOrders?.find(
    (entry) => entry.role === category,
  )?.order;
  if (specific != null) return specific;
  return worker.order ?? 999999;
}

function workersForCategory(
  workers: PostWorker[] | undefined,
  category: TalentCategory,
): PostWorker[] {
  return (workers ?? [])
    .filter((worker) => {
      if (worker.categories?.length) {
        return worker.categories.includes(category);
      }
      return worker.categorySlug === category;
    })
    .slice()
    .sort((a, b) => {
      const orderDiff = roleSortOrder(a, category) - roleSortOrder(b, category);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
}

export default function TalentRoster({ workers = [] }: TalentRosterProps) {
  const searchParams = useSearchParams();
  const isMobile = useMobileBrowseLayout();
  const isCoarsePointer = useCoarsePointerDevice();
  const waitForVideos = true;
  const gateTitles = !isCoarsePointer;
  const [category, setCategory] = useState<TalentCategory>(() =>
    parseCategory(searchParams.get("role")),
  );
  const roster = useMemo(
    () => workersForCategory(workers, category),
    [workers, category],
  );
  const [selected, setSelected] = useState<PostWorker | null>(
    () => workersForCategory(workers, parseCategory(searchParams.get("role")))[0] ?? null,
  );
  const [playingSelectedId, setPlayingSelectedId] = useState<string | null>(
    () =>
      workersForCategory(workers, parseCategory(searchParams.get("role")))[0]
        ?._id ?? null,
  );
  const [bioVisible, setBioVisible] = useState(true);
  const [titleVisible, setTitleVisible] = useState(true);
  const scrollRef = useRef<HTMLUListElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [visibleIds, setVisibleIds] = useState(() => new Set<string>());
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);
  const [bioCanScroll, setBioCanScroll] = useState(false);
  const [showBioTopIndicator, setShowBioTopIndicator] = useState(false);
  const [showBioBottomIndicator, setShowBioBottomIndicator] = useState(false);

  useLayoutEffect(() => {
    return () => hideWarmMediaOverlays();
  }, []);

  const setItemRef = useCallback((id: string, node: HTMLLIElement | null) => {
    if (node) itemRefs.current.set(id, node);
    else itemRefs.current.delete(id);
  }, []);

  const widthAnchor = workers.reduce(
    (longest, person) =>
      person.name.length > longest.length ? person.name : longest,
    "",
  );

  const discipline = categoryToDiscipline[category];
  const playingSelected =
    roster.find((person) => person._id === playingSelectedId) ?? selected;
  const featured = selected?.featuredByDiscipline?.[discipline] ?? null;
  const playingFeatured =
    playingSelected?.featuredByDiscipline?.[discipline] ?? featured;
  const mediaUrl =
    playingFeatured?.videoUrl || playingFeatured?.imageUrl;
  const isVideo = isVideoMediaUrl(mediaUrl);
  const previewStart =
    playingFeatured?.videoPreviewStartSeconds ??
    parseTimeToSeconds(playingFeatured?.videoPreviewStart) ??
    0;

  const preloadItems = useMemo(
    () =>
      roster.map((person) => {
        const hover = person.featuredByDiscipline?.[discipline];
        const url = hover?.videoUrl || hover?.imageUrl;
        return {
          id: person._id,
          videoUrl: isVideoMediaUrl(url) ? url : undefined,
          startTime:
            hover?.videoPreviewStartSeconds ??
            parseTimeToSeconds(hover?.videoPreviewStart) ??
            0,
          posterImageUrl: hover?.posterImageUrl,
          imageUrl: hover?.imageUrl,
          muxVideoUrl: hover?.muxVideoUrl ?? hover?.videoUrl,
        };
      }),
    [roster, discipline],
  );

  const allIds = useMemo(
    () => new Set(roster.map((person) => person._id)),
    [roster],
  );

  const listItemIds = useMemo(
    () => roster.map((person) => person._id),
    [roster],
  );

  const activateFromScroll = useCallback(
    (id: string) => {
      const index = roster.findIndex((person) => person._id === id);
      if (index >= 0) {
        preloadNeighborProjectStills(
          roster.map(
            (person) => person.featuredByDiscipline?.[discipline] ?? {},
          ),
          index,
        );
      }
      setSelected((prev) => {
        if (prev?._id === id) return prev;
        return roster.find((person) => person._id === id) ?? prev;
      });
    },
    [discipline, roster],
  );

  const settleFromScroll = useCallback((id: string) => {
    setPlayingSelectedId((prev) => (prev === id ? prev : id));
  }, []);

  useScrollHoverItem({
    enabled: isMobile,
    scrollRef,
    itemRefs,
    itemIds: listItemIds,
    onActivate: activateFromScroll,
    onSettleActivate: settleFromScroll,
  });

  const effectiveVisibleIds = useMemo(() => {
    if (!waitForVideos) return allIds;
    if (visibleIds.size > 0) return visibleIds;
    return new Set(roster.slice(0, 6).map((person) => person._id));
  }, [waitForVideos, roster, visibleIds, allIds]);

  const priorityVideoUrl = isVideoMediaUrl(mediaUrl) ? mediaUrl : undefined;

  const { readyIds } = useSequentialMediaPreload(
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

    const margin = isMobile ? STILL_PRELOAD_MARGIN_PX : 120;
    itemRefs.current.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < rootRect.bottom + margin && rect.bottom > rootRect.top - margin) {
        const id = element.getAttribute("data-talent-id");
        if (id) next.add(id);
      }
    });

    if (next.size === 0 && roster.length > 0) {
      for (const person of roster.slice(0, 6)) {
        next.add(person._id);
      }
    }

    setVisibleIds((prev) => {
      // Grow-only within the current roster so reveal/layout shifts can't
      // shrink visibility, flip visibilityKey, and retrigger the preload pump.
      const rosterIds = new Set(roster.map((person) => person._id));
      const merged = new Set<string>();
      for (const id of prev) {
        if (rosterIds.has(id)) merged.add(id);
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
  }, [isMobile, roster, waitForVideos]);

  useLayoutEffect(() => {
    if (!waitForVideos || !scrollRef.current) return;

    syncVisibleItems();

    const root = scrollRef.current;
    let ioSettle = 0;
    const observer = new IntersectionObserver(
      () => {
        window.clearTimeout(ioSettle);
        ioSettle = window.setTimeout(
          syncVisibleItems,
          isMobile ? SCROLL_SETTLE_MS : 0,
        );
      },
      {
        root,
        rootMargin: `${isMobile ? STILL_PRELOAD_MARGIN_PX : 120}px 0px`,
        threshold: 0,
      },
    );

    itemRefs.current.forEach((element) => observer.observe(element));

    const resizeObserver = new ResizeObserver(() => syncVisibleItems());
    resizeObserver.observe(root);

    const frame = requestAnimationFrame(() => syncVisibleItems());

    return () => {
      window.clearTimeout(ioSettle);
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [roster, isMobile, syncVisibleItems, waitForVideos]);

  useEffect(() => {
    if (!waitForVideos) return;
    syncVisibleItems();
  }, [readyIds, syncVisibleItems, waitForVideos]);

  const markActivePreloaded = useCallback(() => {
    if (priorityVideoUrl) {
      markVideoUrlPreloaded(priorityVideoUrl, previewStart);
    }
  }, [priorityVideoUrl, previewStart]);

  const loadingId =
    gateTitles && readyIds
      ? roster.find(
          (person) =>
            effectiveVisibleIds.has(person._id) && !readyIds.has(person._id),
        )?._id
      : undefined;

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

  useLayoutEffect(() => {
    if (bioRef.current) bioRef.current.scrollTop = 0;
  }, [selected?._id]);

  useLayoutEffect(() => {
    const scrollEl = bioRef.current;
    if (!scrollEl) return;

    let frame = 0;
    function checkScroll(resetIfFits = false) {
      if (!scrollEl) return;

      const { scrollTop } = scrollEl;
      const overflow = scrollEl.scrollHeight - scrollEl.clientHeight;
      const nextCanScroll = isListOverflowing(scrollEl);
      const threshold = 8;

      setBioCanScroll(nextCanScroll);
      setShowBioTopIndicator(nextCanScroll && scrollTop > threshold);
      setShowBioBottomIndicator(
        nextCanScroll && scrollTop < overflow - threshold,
      );

      if (resetIfFits && !nextCanScroll && scrollTop !== 0) {
        scrollEl.scrollTop = 0;
      }
    }

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        checkScroll(false);
      });
    };

    checkScroll(true);
    void document.fonts?.ready.then(() => checkScroll(true));

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onScroll)
        : null;
    resizeObserver?.observe(scrollEl);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resizeObserver?.disconnect();
    };
  }, [selected?._id, selected?.bio]);

  // Keep the role tab in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("role", category);

    // Preserve SPA routing - if we're in ?section=talent mode, stay there
    if (!params.has("section")) {
      params.set("section", "talent");
    }

    const newUrl = `/?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [category]);

  function showPerson(person: PostWorker) {
    if (person._id === selected?._id) return;
    setSelected(person);
    setPlayingSelectedId(person._id);
    setBioVisible(false);
    setTitleVisible(false);
    window.setTimeout(() => {
      setBioVisible(true);
      setTitleVisible(true);
    }, 180);
  }

  function selectCategory(next: TalentCategory) {
    if (next === category) return;

    const first = workersForCategory(workers, next)[0];
    setCategory(next);
    if (!first) {
      setSelected(null);
      setPlayingSelectedId(null);
      return;
    }

    setBioVisible(false);
    setTitleVisible(false);
    window.setTimeout(() => {
      setSelected(first);
      setPlayingSelectedId(first._id);
      setBioVisible(true);
      setTitleVisible(true);
    }, 180);
  }

  // Scroll + cursor only when content overflows the frame
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let frame = 0;
    function checkScroll(resetIfFits = false) {
      if (!scrollEl) return;

      const { scrollTop } = scrollEl;
      const overflow = scrollEl.scrollHeight - scrollEl.clientHeight;
      const nextCanScroll = isListOverflowing(scrollEl);
      const threshold = 8;

      setCanScroll(nextCanScroll);
      setShowTopIndicator(nextCanScroll && scrollTop > threshold);
      setShowBottomIndicator(nextCanScroll && scrollTop < overflow - threshold);

      if (resetIfFits && !nextCanScroll && scrollTop !== 0) {
        scrollEl.scrollTop = 0;
      }
    }

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        checkScroll(false);
      });
    };

    checkScroll(true);
    void document.fonts?.ready.then(() => checkScroll(true));

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onScroll)
        : null;
    resizeObserver?.observe(scrollEl);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resizeObserver?.disconnect();
    };
  }, [roster]);

  const backgroundMedia =
    selected && mediaUrl ? (
      <>
        <div className="talent-media" aria-hidden="true">
          <HoverStillBackdrop
            videoUrl={isVideo ? mediaUrl : undefined}
            stillProject={featured}
            startTime={previewStart}
            preferStill={Boolean(
              selected &&
                playingSelected &&
                selected._id !== playingSelected._id,
            )}
            onVideoReady={markActivePreloaded}
          />
        </div>
        {/* Left scrim is desktop-only — mobile keeps the photo clear */}
        {!isMobile ? (
          <div className="talent-media-scrim" aria-hidden="true" />
        ) : null}
      </>
    ) : null;

  const categoryNav = (
    <nav
      className={`talent-categories ${textNav} ${isMobile ? "" : STAGE_LOGO_NAV_GAP_CLASS}`}
      aria-label="Talent categories"
    >
      {CATEGORIES.map((item, index) => (
        <span key={item.id} className="talent-categories__item">
          {index > 0 && (
            <span className="talent-categories__sep" aria-hidden="true">
              /
            </span>
          )}
          <button
            type="button"
            className={
              category === item.id
                ? "talent-categories__btn is-active"
                : "talent-categories__btn"
            }
            onClick={() => selectCategory(item.id)}
            aria-current={category === item.id ? "true" : undefined}
          >
            {item.label}
          </button>
        </span>
      ))}
    </nav>
  );

  const listScrollable = canScroll || (isMobile && roster.length > 0);

  const nameList = (
    <ul
      ref={scrollRef}
      {...(listScrollable ? { "data-scrollable-list": true } : {})}
      className={[
        "talent-list",
        listScrollable ? "is-scrollable" : "",
        isMobile ? "talent-list--mobile" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {roster.map((person) => {
        const isReady =
          !gateTitles || !readyIds || readyIds.has(person._id);
        const isVisible =
          !gateTitles || effectiveVisibleIds.has(person._id);
        const isLoading = person._id === loadingId;

        if (gateTitles && !isReady && !isVisible) {
          return (
            <li
              key={person._id}
              ref={(node) => setItemRef(person._id, node)}
              data-talent-id={person._id}
              className={ITEM_MIN_HEIGHT}
              aria-hidden
            />
          );
        }

        if (!isReady && isLoading) {
          return (
            <li
              key={person._id}
              ref={(node) => setItemRef(person._id, node)}
              data-talent-id={person._id}
              aria-busy="true"
            >
              <div
                className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"
                aria-hidden
              />
              <span className="sr-only">Loading {person.name}</span>
            </li>
          );
        }

        if (!isReady) {
          return (
            <li
              key={person._id}
              ref={(node) => setItemRef(person._id, node)}
              data-talent-id={person._id}
              className={ITEM_MIN_HEIGHT}
              aria-hidden
            />
          );
        }

        const isActive = person._id === (selected?._id ?? (isMobile ? roster[0]?._id : undefined));
        return (
          <li
            key={person._id}
            ref={(node) => setItemRef(person._id, node)}
            data-talent-id={person._id}
            className="animate-[fade-in_0.25s_ease-out]"
          >
            <Link
              href={`/talent/${person.slug}?role=${category}`}
              aria-current={isActive ? "true" : undefined}
              className={
                isActive
                  ? "talent-list__name is-active"
                  : "talent-list__name"
              }
              onMouseEnter={() => {
                if (!isMobile) showPerson(person);
              }}
              onFocus={() => {
                if (!isMobile) showPerson(person);
              }}
            >
              {person.name}
            </Link>
          </li>
        );
      })}
      {isMobile && roster.length > 0 ? (
        <li className="browse-list-end-spacer" aria-hidden />
      ) : null}
    </ul>
  );

  if (isMobile) {
    return (
      <motion.div
        className="absolute inset-0 flex flex-col overflow-hidden bg-transparent text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        {backgroundMedia}

        <div className="relative z-10 flex h-full min-h-0 flex-col pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]">
          <MobileBrandBar />

          <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
            {categoryNav}

            {/* Hug-wrap brackets around the roster — matches the mobile mock */}
            <TalentListSlot canScroll={canScroll}>
              <div
                className={[
                  "talent-list-frame scroll-indicator-wrapper",
                  showTopIndicator ? "can-scroll-up" : "",
                  showBottomIndicator ? "can-scroll-down" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="talent-list__sizer" aria-hidden="true">
                  {widthAnchor}
                </span>

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

                {nameList}

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
            </TalentListSlot>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-transparent text-foreground"
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
        className="relative z-10 flex h-full min-h-0 flex-col px-8"
        style={{
          paddingTop: STAGE_LOGO_TOP_PADDING,
          paddingBottom: STAGE_NAV_CLEARANCE,
        }}
      >
        <div className="shrink-0">
          <BrandHeader variant="work" widthClass="w-[30rem] max-w-full" />
          {categoryNav}
        </div>

        <div className="talent-body">
          <div className="talent-left">
            <TalentListSlot canScroll={canScroll}>
              <div
                className={[
                  "talent-list-frame scroll-indicator-wrapper",
                  showTopIndicator ? "can-scroll-up" : "",
                  showBottomIndicator ? "can-scroll-down" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="talent-list__sizer" aria-hidden="true">
                  {widthAnchor}
                </span>

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

                {nameList}

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
            </TalentListSlot>
          </div>

          <div
            className="talent-stage"
            aria-hidden={!selected?.featuredWorkTitle}
          >
            {selected?.featuredWorkTitle && (
              <p
                className={`talent-stage__title ${titleVisible ? "is-visible" : ""} ${mediaUrl ? "has-media" : ""}`}
              >
                {selected.featuredWorkTitle}
              </p>
            )}
          </div>

          <aside
            className={[
              "talent-bio hover-desc scroll-indicator-wrapper",
              bioVisible && selected?.bio ? "is-visible" : "",
              showBioTopIndicator ? "can-scroll-up" : "",
              showBioBottomIndicator ? "can-scroll-down" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-live="polite"
            aria-hidden={!selected?.bio}
          >
            <div
              className={`scroll-indicator top ${showBioTopIndicator ? "visible" : ""}`}
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

            <div
              ref={bioRef}
              {...(bioCanScroll ? { "data-scrollable-list": true } : {})}
              className="talent-bio__scroll"
            >
              {selected?.bio ? <p>{selected.bio}</p> : null}
            </div>

            <div
              className={`scroll-indicator bottom ${showBioBottomIndicator ? "visible" : ""}`}
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
          </aside>
        </div>
      </div>
    </motion.div>
  );
}
