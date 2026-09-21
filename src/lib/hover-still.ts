import { isVimeoUrl } from "@/lib/vimeo";
import type { FeaturedProjectMedia } from "@/sanity/types";

export type HoverStillProject = Pick<
  FeaturedProjectMedia,
  | "videoUrl"
  | "imageUrl"
  | "videoPreviewStartSeconds"
  | "posterImageUrl"
  | "muxVideoUrl"
>;

const vimeoThumbnailCache = new Map<string, Promise<string | undefined>>();
const vimeoThumbnailValue = new Map<string, string | undefined>();
const stillReadyCache = new Map<string, Promise<void>>();
const stillDecoded = new Set<string>();
const STILL_TIMEOUT_MS = 2500;

function muxPlaybackIdFromStreamUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "stream.mux.com") return null;
    const playbackId = parsed.pathname.split("/").filter(Boolean)[0];
    return playbackId?.replace(/\.(m3u8|mp4)$/i, "") || null;
  } catch {
    return null;
  }
}

function muxThumbnailUrl(project: HoverStillProject): string | undefined {
  const playbackId =
    muxPlaybackIdFromStreamUrl(project.muxVideoUrl) ||
    muxPlaybackIdFromStreamUrl(project.videoUrl);
  if (!playbackId) return undefined;
  const time = Math.max(project.videoPreviewStartSeconds ?? 1, 0);
  const params = new URLSearchParams({
    time: String(time),
    width: "1920",
    fit_mode: "preserve",
  });
  return `https://image.mux.com/${playbackId}/thumbnail.webp?${params.toString()}`;
}

function enlargeVimeoThumbnailUrl(thumbnailUrl: string): string {
  return thumbnailUrl.replace(/_\d+x\d+(\.\w+)(\?.*)?$/, "_1280x720$1$2");
}

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Poster, then hero/imageUrl, then a Mux still generated from the playback ID. */
export function getProjectHoverStillUrl(
  project: HoverStillProject | null | undefined,
): string | undefined {
  if (!project) return undefined;
  return (
    project.posterImageUrl ||
    project.imageUrl ||
    muxThumbnailUrl(project) ||
    undefined
  );
}

export function isHoverStillReady(url: string | undefined): boolean {
  return Boolean(url && stillDecoded.has(url));
}

export function markHoverStillReady(url: string | undefined) {
  if (url) stillDecoded.add(url);
}

export function waitForHoverStill(
  url: string,
  priority: "high" | "auto" = "auto",
): Promise<void> {
  const cached = stillReadyCache.get(url);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    const done = (ok: boolean) => {
      if (ok) stillDecoded.add(url);
      resolve();
    };
    if (priority === "high") {
      image.fetchPriority = "high";
    }
    image.addEventListener("load", () => done(image.naturalWidth > 0), {
      once: true,
    });
    image.addEventListener("error", () => done(false), { once: true });
    image.src = url;
    if (image.complete && image.naturalWidth > 0) {
      done(true);
    }
  });

  stillReadyCache.set(url, promise);
  return promise;
}

export function preloadHoverStill(
  url: string | undefined,
  priority: "high" | "auto" = "auto",
) {
  if (!url || typeof window === "undefined") return;
  void waitForHoverStill(url, priority);
}

/** Wait until the hover poster is decoded (or give up quickly). Never waits on video. */
export async function waitForProjectHoverStill(
  project: HoverStillProject,
  priority: "high" | "auto" = "auto",
): Promise<void> {
  const stillUrl = getProjectHoverStillUrl(project);
  if (stillUrl) {
    await Promise.race([
      waitForHoverStill(stillUrl, priority),
      waitMs(STILL_TIMEOUT_MS),
    ]);
    return;
  }

  if (project.videoUrl && isVimeoUrl(project.videoUrl)) {
    const thumb = await Promise.race([
      resolveVimeoThumbnail(project.videoUrl),
      waitMs(STILL_TIMEOUT_MS).then(() => undefined),
    ]);
    if (thumb) {
      await Promise.race([
        waitForHoverStill(thumb, priority),
        waitMs(STILL_TIMEOUT_MS),
      ]);
    }
  }
}

/** Sync peek so hover remounts can keep the poster up without a black frame. */
export function peekVimeoThumbnail(videoUrl: string): string | undefined {
  return vimeoThumbnailValue.get(videoUrl);
}

export function resolveVimeoThumbnail(
  videoUrl: string,
): Promise<string | undefined> {
  const cached = vimeoThumbnailCache.get(videoUrl);
  if (cached) {
    void cached.then((url) => {
      if (url) vimeoThumbnailValue.set(videoUrl, url);
    });
    return cached;
  }

  const promise = (async () => {
    if (!isVimeoUrl(videoUrl)) return undefined;
    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(oembedUrl);
      if (!response.ok) return undefined;
      const data = (await response.json()) as { thumbnail_url?: string };
      if (!data.thumbnail_url) return undefined;
      const url = enlargeVimeoThumbnailUrl(data.thumbnail_url);
      vimeoThumbnailValue.set(videoUrl, url);
      return url;
    } catch {
      return undefined;
    }
  })();

  vimeoThumbnailCache.set(videoUrl, promise);
  return promise;
}

export function preloadProjectHoverStill(
  project: HoverStillProject,
  priority: "high" | "auto" = "auto",
) {
  const stillUrl = getProjectHoverStillUrl(project);
  if (stillUrl) {
    preloadHoverStill(stillUrl, priority);
    return;
  }
  if (project.videoUrl && isVimeoUrl(project.videoUrl)) {
    void resolveVimeoThumbnail(project.videoUrl).then((url) =>
      preloadHoverStill(url, priority),
    );
  }
}

export function projectHasHoverStill(project: HoverStillProject): boolean {
  if (getProjectHoverStillUrl(project)) return true;
  return Boolean(project.videoUrl && isVimeoUrl(project.videoUrl));
}

/** Warm the active still first, then the next few so scroll doesn't wait. */
export function preloadNeighborProjectStills(
  projects: readonly HoverStillProject[],
  activeIndex: number,
  ahead = 3,
) {
  if (activeIndex < 0 || activeIndex >= projects.length) return;
  preloadProjectHoverStill(projects[activeIndex], "high");
  for (const project of projects.slice(activeIndex + 1, activeIndex + 1 + ahead)) {
    preloadProjectHoverStill(project);
  }
}
