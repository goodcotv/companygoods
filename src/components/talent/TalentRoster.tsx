"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BottomChrome } from "@/components/BottomChrome";
import { BrandHeader } from "@/components/BrandHeader";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { ScaleToFit } from "@/components/ScaleToFit";
import { CATEGORIES, type TalentCategory } from "@/data/talent";
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
  onNavigate?: (section: "work" | "talent" | "info") => void;
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

export default function TalentRoster({ workers = [], onNavigate }: TalentRosterProps) {
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

        <div className="px-8 pt-4">
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

            <div className="talent-list-slot">
              <AnimatedCornerBrackets inset={0} layoutId="page-corners" />
              <div className="talent-list-frame">
                <span className="talent-list__sizer" aria-hidden="true">
                  {widthAnchor}
                </span>
                <ul className="talent-list">
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
