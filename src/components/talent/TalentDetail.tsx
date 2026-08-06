"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { BottomChrome } from "@/components/BottomChrome";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { MobileBrandBar } from "@/components/MobileBrandBar";
import { ScaleToFit } from "@/components/ScaleToFit";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
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
  const isMobile = useMobileBrowseLayout();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    projects[0]?._id ?? null,
  );
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  const activeProject =
    projects.find((project) => project._id === activeProjectId) ?? projects[0];

  // Background stays on the talent's first project video (does not swap on hover).
  const firstProject = projects[0];
  const mediaVideoUrl = firstProject?.videoUrl;
  const mediaImageUrl = firstProject?.imageUrl || talent.imageUrl;

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
        {mediaVideoUrl && isVimeoUrl(mediaVideoUrl) ? (
          <VimeoBackground
            key={firstProject?._id}
            src={mediaVideoUrl}
            title={
              firstProject
                ? `${firstProject.title} video`
                : `${talent.name} project video`
            }
          />
        ) : mediaVideoUrl ? (
          <video
            key={firstProject?._id}
            src={mediaVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            aria-label={
              firstProject
                ? `${firstProject.title} video`
                : `${talent.name} project video`
            }
          />
        ) : mediaImageUrl ? (
          <Image
            key={firstProject?._id ?? "portrait"}
            src={mediaImageUrl}
            alt={firstProject ? firstProject.title : talent.name}
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
          <li key={project._id}>
            <Link
              href={`/work/${project.slug}`}
              className={`group block w-fit max-w-full text-left transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-white/35 hover:text-foreground"
              }`}
              onMouseEnter={() => {
                if (!isMobile) setActiveProjectId(project._id);
              }}
              onTouchStart={() => setActiveProjectId(project._id)}
              onFocus={() => setActiveProjectId(project._id)}
            >
              <span
                className={`block font-heading font-extrabold leading-none tracking-[-0.02em] ${
                  isMobile
                    ? "text-[clamp(1.45rem,6.5vw,1.9rem)]"
                    : "text-[21pt]"
                }`}
              >
                {primary}
              </span>
              {secondary ? (
                <span
                  className={`mt-1.5 block font-sans tracking-[0.14em] uppercase ${
                    isMobile ? "text-[12px]" : "text-[11px]"
                  }`}
                >
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

  if (isMobile) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
        {backgroundMedia}

        <div className="relative z-10 flex h-full min-h-0 flex-col pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]">
          <MobileBrandBar />

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
    <ScaleToFit width={STAGE_WIDTH} height={STAGE_HEIGHT}>
      <div
        className="relative flex flex-col overflow-hidden bg-background text-foreground"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        {backgroundMedia}

        <div className="absolute top-0 left-0 z-20 px-8 pt-4">
          <BrandHeader
            variant="display"
            widthClass="w-[30rem] max-w-full"
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
          className="absolute right-8 bottom-7 z-30 justify-end"
        />
      </div>
    </ScaleToFit>
  );
}
