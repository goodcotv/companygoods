"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { useRouter } from "next/navigation";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { ControlledVideo } from "@/components/project/ControlledVideo";
import { isListOverflowing } from "@/lib/cursor-hover";
import type {
  Discipline,
} from "@/data/projects";
import { DISCIPLINES } from "@/data/projects";
import type {
  MediaSection,
  PortableTextBlock,
  Project,
} from "@/sanity/types";
import { isGifUrl } from "@/sanity/lib/image";
import { isImageRowSection } from "@/sanity/types";

type ProjectPlayerProps = {
  project: Project;
};

const DISCIPLINE_MAP: Record<string, Discipline> = {
  edit: "EDIT",
  color: "COLOR",
  sound: "SOUND",
  vfx: "VFX",
};

function portableTextToPlainText(blocks?: PortableTextBlock[]): string {
  if (!blocks?.length) return "";
  return blocks
    .filter((block) => block._type === "block")
    .map((block) => block.children?.map((child) => child.text).join("") || "")
    .filter(Boolean)
    .join("\n\n");
}

function getDisciplines(project: Project): Discipline[] {
  const found = new Set<Discipline>();
  for (const credit of project.postCredits ?? []) {
    const mapped = DISCIPLINE_MAP[credit.discipline];
    if (mapped) found.add(mapped);
  }
  return DISCIPLINES.filter((d) => found.has(d));
}

/**
 * Bottom captions rest just above the fixed frame's lower brackets, which
 * top out ~5rem above the viewport edge (4rem at md).
 */
function getCaptionPositionClasses(position = "bottom-left") {
  const bottom = "bottom-[6.2rem] md:bottom-[5.2rem]";

  switch (position) {
    case "bottom-center":
      return `${bottom} left-1/2 -translate-x-1/2 text-center`;
    case "bottom-right":
      return `${bottom} right-8`;
    case "center":
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center";
    case "bottom-left":
    default:
      return `${bottom} left-8`;
  }
}

function captionToText(caption?: PortableTextBlock[]): string {
  return portableTextToPlainText(caption);
}

function ProjectImage({ src, unoptimized, ...props }: ImageProps) {
  const url = typeof src === "string" ? src : undefined;
  return (
    <Image
      src={src}
      unoptimized={unoptimized ?? isGifUrl(url)}
      {...props}
    />
  );
}

/**
 * Fixed viewfinder frame that floats over scrolling project content.
 * Top clears the Back button; bottom clears the video scrubber.
 * Shared `page-corners` so brackets morph in from list/scroll/talent.
 */
function ProjectFrame() {
  return (
    <div
      data-project-player-chrome
      className="pointer-events-none fixed inset-x-4 bottom-20 top-11 z-10 md:inset-x-8 md:bottom-16 md:top-16"
      aria-hidden
    >
      <AnimatedCornerBrackets inset={0} layoutId="page-corners" />
    </div>
  );
}

function MediaCaption({
  caption,
  position,
}: {
  caption: string;
  position?: string;
}) {
  return (
    <div
      className={`absolute z-10 max-w-lg ${getCaptionPositionClasses(position)}`}
    >
      <div className="relative px-5 py-4">
        <p className="whitespace-pre-wrap font-display text-[11pt] font-medium leading-relaxed text-white/90 md:text-[13pt]">
          {caption}
        </p>
      </div>
    </div>
  );
}

function HeroSection({
  project,
  description,
  disciplines,
}: {
  project: Project;
  description: string;
  disciplines: Discipline[];
}) {
  const poster = project.posterImageUrl ?? project.imageUrl;
  const hasVideo = Boolean(project.videoUrl);
  const descRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);
  const hasCopy =
    Boolean(project.client) ||
    Boolean(project.title) ||
    disciplines.length > 0 ||
    Boolean(description);

  // Scroll hint only when the description overflows its frame
  useLayoutEffect(() => {
    const scrollEl = descRef.current;
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
  }, [description]);

  return (
    <section
      data-project-section
      className="relative h-dvh w-full overflow-hidden bg-black"
    >
      {hasVideo ? (
        <ControlledVideo
          src={project.videoUrl!}
          poster={poster}
          className="absolute inset-0"
          priority
        />
      ) : poster ? (
        <ProjectImage
          src={poster}
          alt={project.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {hasCopy && (
        <div
          data-project-player-chrome
          className="pointer-events-auto absolute bottom-[4.75rem] left-4 right-20 z-20 flex max-h-[35dvh] max-w-lg flex-col md:bottom-20 md:left-8 md:right-auto"
        >
          <div className="relative flex min-h-0 flex-col px-5 py-4">
            <div className="flex shrink-0 flex-wrap items-start gap-x-3 gap-y-2">
              {project.title && (
                <h1 className="font-heading text-[19pt] leading-[1.05] text-white md:text-[21pt]">
                  {project.title}
                </h1>
              )}
              {disciplines.length > 0 && (
                <div className="flex flex-wrap items-start gap-1">
                  {disciplines.map((discipline) => (
                    <span
                      key={discipline}
                      className="rounded border border-white/10 bg-[#4a4a4a]/65 px-1.5 py-px font-sans text-[10px] tracking-[0.1em] uppercase text-white/90 backdrop-blur-md md:text-[9px]"
                    >
                      {discipline}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {project.client && (
              <p className="mt-1 shrink-0 font-display text-[13pt] font-medium uppercase leading-none text-white/90">
                {project.client}
              </p>
            )}

            {description && (
              <div
                className={[
                  "scroll-indicator-wrapper relative mt-3 flex min-h-0 flex-1 flex-col",
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

                <div
                  ref={descRef}
                  {...(canScroll ? { "data-scrollable-list": true } : {})}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
                >
                  <p className="whitespace-pre-wrap font-display text-[11pt] font-medium leading-relaxed text-white/90 md:text-[13pt]">
                    {description}
                  </p>
                </div>

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
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MediaSectionShell({
  section,
  children,
}: {
  section: MediaSection;
  children: React.ReactNode;
}) {
  const contained = section.withMargins === true;
  const caption = captionToText(section.caption);

  if (contained) {
    return (
      <section
        className="relative box-border flex min-h-dvh w-full shrink-0 items-center justify-center bg-black px-6 py-12 md:px-[8vw] md:py-16"
        data-project-section
      >
        <div className="relative w-full max-w-[1600px]">{children}</div>
        {caption && (
          <MediaCaption caption={caption} position={section.captionPosition} />
        )}
      </section>
    );
  }

  return (
    <section
      className="relative box-border h-dvh w-full shrink-0 bg-black"
      data-project-section
    >
      <div className="relative h-full min-h-0 w-full overflow-hidden">
        {children}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
        {caption && (
          <MediaCaption caption={caption} position={section.captionPosition} />
        )}
      </div>
    </section>
  );
}

function SingleMediaSectionComponent({ section }: { section: MediaSection }) {
  if (isImageRowSection(section)) return null;

  const isImage = section.mediaType === "image" || (!section.videoUrl && Boolean(section.imageUrl));
  const imageSrc = section.imageUrl;
  const videoSrc = section.videoUrl;
  const contained = section.withMargins === true;

  return (
    <MediaSectionShell section={section}>
      {isImage && imageSrc ? (
        contained ? (
          <ProjectImage
            src={imageSrc}
            alt=""
            width={1600}
            height={900}
            className="h-auto w-full"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1600px"
          />
        ) : (
          <ProjectImage
            src={imageSrc}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
        )
      ) : videoSrc ? (
        <ControlledVideo
          src={videoSrc}
          className={contained ? "relative aspect-video w-full" : "absolute inset-0"}
        />
      ) : null}
    </MediaSectionShell>
  );
}

function ImageRowMediaSectionComponent({ section }: { section: MediaSection }) {
  if (!isImageRowSection(section) || section.imageUrls.length === 0) return null;

  const contained = section.withMargins === true;
  const cols =
    section.columnCount === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2";

  return (
    <MediaSectionShell section={section}>
      <div
        className={`grid w-full gap-2 md:gap-3 ${cols} ${contained ? "" : "h-full"}`}
      >
        {section.imageUrls.map((url) =>
          contained ? (
            <ProjectImage
              key={url}
              src={url}
              alt=""
              width={800}
              height={600}
              className="h-auto w-full"
              sizes={
                section.columnCount === 3
                  ? "(max-width: 768px) 100vw, 33vw"
                  : "(max-width: 768px) 100vw, 50vw"
              }
            />
          ) : (
            <div key={url} className="relative h-full w-full">
              <ProjectImage
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes={
                  section.columnCount === 3
                    ? "(max-width: 768px) 100vw, 33vw"
                    : "(max-width: 768px) 100vw, 50vw"
                }
              />
            </div>
          ),
        )}
      </div>
    </MediaSectionShell>
  );
}

function MediaSectionComponent({ section }: { section: MediaSection }) {
  if (isImageRowSection(section)) {
    return <ImageRowMediaSectionComponent section={section} />;
  }
  return <SingleMediaSectionComponent section={section} />;
}

export function ProjectPlayer({ project }: ProjectPlayerProps) {
  const router = useRouter();
  const description = project.postWorkDescription?.trim() || "";
  const disciplines = getDisciplines(project);

  // Home / talent shells lock html+body overflow; clear so additional media sections can scroll.
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;

    html.style.overflow = "";
    body.style.overflow = "";
    html.style.overscrollBehavior = "";
    body.style.overscrollBehavior = "";
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [project.slug]);

  const mediaSections = project.mediaSections ?? [];

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-black">
      <ProjectFrame />

      <button
        type="button"
        data-project-player-chrome
        onClick={() => router.back()}
        className="pointer-events-auto fixed left-4 top-4 z-30 font-display text-[13pt] font-medium uppercase leading-none text-white transition-opacity hover:opacity-70 md:left-8 md:top-8 md:text-[13pt]"
      >
        Back
      </button>

      <HeroSection
        project={project}
        description={description}
        disciplines={disciplines}
      />

      {mediaSections.map((section, index) => (
        <MediaSectionComponent
          key={
            isImageRowSection(section)
              ? `row-${section.imageUrls[0] ?? index}`
              : `${section.mediaType}-${section.videoUrl ?? section.imageUrl ?? index}`
          }
          section={section}
        />
      ))}
    </div>
  );
}
