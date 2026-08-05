"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { BottomChrome } from "@/components/BottomChrome";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { ScaleToFit } from "@/components/ScaleToFit";
import { isListOverflowing } from "@/lib/cursor-hover";
import { STAGE_HEIGHT, STAGE_NAV_CLEARANCE, STAGE_WIDTH } from "@/lib/stage";
import { isVimeoUrl } from "@/lib/vimeo";
import type { Project, TalentDetailData } from "@/sanity/types";
import { VimeoBackground } from "@/components/VimeoBackground";

type TalentDetailProps = {
  talent: TalentDetailData;
  projects: Project[];
};

export function TalentDetail({ talent, projects }: TalentDetailProps) {
  const router = useRouter();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    projects[0]?._id ?? null,
  );
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  const activeProject =
    projects.find((project) => project._id === activeProjectId) ?? projects[0];
  const mediaVideoUrl = activeProject?.videoUrl;
  const mediaImageUrl =
    activeProject?.imageUrl || talent.imageUrl;

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

  return (
      <ScaleToFit width={STAGE_WIDTH} height={STAGE_HEIGHT}>
        <div
          className="relative flex flex-col overflow-hidden bg-background text-foreground"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
        >
          {/* Full-screen background media */}
          <div className="talent-media">
            {mediaVideoUrl && isVimeoUrl(mediaVideoUrl) ? (
              <VimeoBackground
                key={activeProject?._id}
                src={mediaVideoUrl}
                title={
                  activeProject
                    ? `${activeProject.title} video`
                    : `${talent.name} project video`
                }
              />
            ) : mediaVideoUrl ? (
              <video
                key={activeProject?._id}
                src={mediaVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                aria-label={
                  activeProject
                    ? `${activeProject.title} video`
                    : `${talent.name} project video`
                }
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
          {/* Sibling of the media box, not a child — the media clips its children,
              which would trim the fade back to the edge it needs to overscan. */}
          <div className="talent-media-scrim" aria-hidden="true" />

          {/* Brand header */}
          <div className="absolute top-0 left-0 z-20 px-8 pt-4">
            <BrandHeader
              variant="display"
              widthClass="w-[30rem] max-w-full"
            />
          </div>

          {/* Left sidebar with talent name and projects */}
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

                  <ul
                    ref={scrollRef}
                    {...(canScroll ? { "data-scrollable-list": true } : {})}
                    className={[
                      "talent-detail-projects",
                      canScroll ? "is-scrollable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {projects.map((project) => {
                      const isActive = project._id === activeProject?._id;
                      return (
                        <li key={project._id}>
                          <Link
                            href={`/work/${project.slug}`}
                            className={`group block w-fit max-w-full text-left transition-colors ${
                              isActive
                                ? "text-foreground"
                                : "text-white/35 hover:text-foreground"
                            }`}
                            onMouseEnter={() => setActiveProjectId(project._id)}
                          >
                            <span className="block font-heading text-[21pt] font-extrabold leading-none tracking-[-0.02em]">
                              {project.title}
                            </span>
                            {project.client && (
                              <span className="mt-1.5 block font-sans text-[11px] tracking-[0.14em] uppercase">
                                {project.client}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

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
            className="absolute right-8 bottom-7 z-30 justify-end"
          />
        </div>
      </ScaleToFit>
  );
}
