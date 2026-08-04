"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BrandHeader } from "@/components/BrandHeader";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { CATEGORIES, type TalentCategory } from "@/data/talent";
import { isListOverflowing } from "@/lib/cursor-hover";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/stage";
import type { PostDiscipline, PostWorker } from "@/sanity/types";

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
  const [bioVisible, setBioVisible] = useState(true);
  const [titleVisible, setTitleVisible] = useState(true);
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  const widthAnchor = workers.reduce(
    (longest, person) =>
      person.name.length > longest.length ? person.name : longest,
    "",
  );

  const discipline = categoryToDiscipline[category];
  const featured = selected?.featuredByDiscipline?.[discipline] ?? null;
  const mediaUrl = featured?.videoUrl || featured?.imageUrl;
  const isVideo = Boolean(featured?.videoUrl);

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

    setBioVisible(false);
    setTitleVisible(false);

    window.setTimeout(() => {
      setSelected(person);
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
      return;
    }

    setBioVisible(false);
    setTitleVisible(false);
    window.setTimeout(() => {
      setSelected(first);
      setBioVisible(true);
      setTitleVisible(true);
    }, 180);
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
  }, [roster]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-background text-foreground"
      style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
    >
        {selected && mediaUrl && (
          <>
            <div className="talent-media" aria-hidden="true">
              {isVideo ? (
                <video
                  key={`${selected._id}-${discipline}`}
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  key={`${selected._id}-${discipline}`}
                  src={mediaUrl}
                  alt=""
                />
              )}
            </div>
            <div className="talent-media-scrim" aria-hidden="true" />
          </>
        )}

        <div className="relative z-10 px-8 pt-4">
          <BrandHeader
            variant="display"
            widthClass="w-[30rem] max-w-full"
          />
        </div>

        <div className="talent-body">
          <div className="talent-left">
            <nav className="talent-categories" aria-label="Talent categories">
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
                <span className="talent-list__sizer" aria-hidden="true">
                  {widthAnchor}
                </span>
                
                {/* Top scroll indicator */}
                <div className={`scroll-indicator top ${showTopIndicator ? 'visible' : ''}`}>
                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                    <path d="M2 8L8 2L14 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <ul
                  ref={scrollRef}
                  {...(canScroll ? { "data-scrollable-list": true } : {})}
                  className={[
                    "talent-list",
                    canScroll ? "is-scrollable" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {roster.map((person) => {
                    const isActive = person._id === selected?._id;
                    return (
                      <li key={person._id}>
                        <Link
                          href={`/talent/${person.slug}?role=${category}`}
                          className={
                            isActive
                              ? "talent-list__name is-active"
                              : "talent-list__name"
                          }
                          onMouseEnter={() => showPerson(person)}
                        >
                          {person.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Bottom scroll indicator */}
                <div className={`scroll-indicator bottom ${showBottomIndicator ? 'visible' : ''}`}>
                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                    <path d="M2 2L8 8L14 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
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
            className={`talent-bio ${bioVisible && selected?.bio ? "is-visible" : ""}`}
            aria-live="polite"
            aria-hidden={!selected?.bio}
          >
            {selected?.bio ? <p>{selected.bio}</p> : null}
          </aside>
        </div>
      </motion.div>
  );
}
