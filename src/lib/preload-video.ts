import { buildVimeoEmbedSrc, parseVimeoUrl } from "@/lib/vimeo";

const PRELOAD_TIMEOUT_MS = 15000;
const SEEK_TIMEOUT_MS = 4000;
const MAX_WARM_VIDEOS = 16;
const VIMEO_ORIGIN = "https://player.vimeo.com";

export const WARM_VIDEO_LAYER_ID = "warm-video-layer";

export function warmClipKey(url: string, startTime = 0) {
  return `${url}@@${startTime}`;
}

function warmVideoLayer(): HTMLElement {
  return document.getElementById(WARM_VIDEO_LAYER_ID) ?? document.body;
}

function mediaSrcWithStart(src: string, startSeconds: number): string {
  if (startSeconds <= 0 || src.includes("#t=")) return src;
  const hashIndex = src.indexOf("#");
  const base = hashIndex >= 0 ? src.slice(0, hashIndex) : src;
  return `${base}#t=${startSeconds}`;
}

function parseVimeoEvent(data: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function postVimeo(iframe: HTMLIFrameElement, message: Record<string, unknown>) {
  iframe.contentWindow?.postMessage(message, "*");
}

/** Session cache so category remounts don't re-wait on already-warmed clips. */
const preloadCache = new Map<string, Promise<void>>();

const warmMp4s = new Map<string, HTMLVideoElement>();
const warmVimeos = new Map<string, HTMLIFrameElement>();
const warmOrder: string[] = [];
const pinnedKeys = new Set<string>();
const displayedKeys = new Set<string>();

function touchWarm(key: string) {
  const index = warmOrder.indexOf(key);
  if (index >= 0) warmOrder.splice(index, 1);
  warmOrder.push(key);
}

function parkVideo(video: HTMLVideoElement) {
  video.pause();
  video.style.cssText =
    "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;bottom:0;border:0";
  if (video.parentElement !== document.body) {
    document.body.appendChild(video);
  }
}

function destroyVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.remove();
}

function destroyWarm(key: string) {
  const video = warmMp4s.get(key);
  if (video) {
    warmMp4s.delete(key);
    destroyVideo(video);
  }
  const iframe = warmVimeos.get(key);
  if (iframe) {
    warmVimeos.delete(key);
    postVimeo(iframe, { method: "pause" });
    iframe.remove();
  }
}

function evictWarmIfNeeded() {
  while (warmOrder.length > MAX_WARM_VIDEOS) {
    const oldest = warmOrder.find((key) => !pinnedKeys.has(key));
    if (!oldest) break;
    const index = warmOrder.indexOf(oldest);
    if (index >= 0) warmOrder.splice(index, 1);
    destroyWarm(oldest);
  }
}

function createParkedVideo(): HTMLVideoElement {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  parkVideo(video);
  return video;
}

function ensureWarmVideo(url: string, startTime = 0): HTMLVideoElement {
  const key = warmClipKey(url, startTime);
  const existing = warmMp4s.get(key);
  if (existing) {
    touchWarm(key);
    return existing;
  }

  const video = createParkedVideo();
  video.src = mediaSrcWithStart(url, startTime);
  video.load();
  warmMp4s.set(key, video);
  touchWarm(key);
  evictWarmIfNeeded();
  return video;
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  event: "loadedmetadata" | "loadeddata" | "seeked",
  timeoutMs: number,
): Promise<void> {
  const readyStateForEvent = {
    loadedmetadata: HTMLMediaElement.HAVE_METADATA,
    loadeddata: HTMLMediaElement.HAVE_CURRENT_DATA,
  } as const;

  if (event !== "seeked" && video.readyState >= readyStateForEvent[event]) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      video.removeEventListener(event, onEvent);
      video.removeEventListener("error", onEvent);
      resolve();
    };
    const onEvent = () => finish();
    const timeout = setTimeout(finish, timeoutMs);
    video.addEventListener(event, onEvent, { once: true });
    video.addEventListener("error", onEvent, { once: true });
  });
}

async function prepareWarmMp4(url: string, startTime: number): Promise<void> {
  const key = warmClipKey(url, startTime);
  pinnedKeys.add(key);

  try {
    const video = ensureWarmVideo(url, startTime);
    await waitForVideoEvent(video, "loadedmetadata", PRELOAD_TIMEOUT_MS);

    if (startTime > 0) {
      const duration = video.duration;
      const target = Number.isFinite(duration)
        ? Math.min(startTime, Math.max(0, duration - 0.05))
        : startTime;
      if (Math.abs(video.currentTime - target) > 0.35) {
        video.currentTime = target;
        await waitForVideoEvent(video, "seeked", SEEK_TIMEOUT_MS);
      }
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForVideoEvent(video, "loadeddata", PRELOAD_TIMEOUT_MS);
    }
  } finally {
    if (!displayedKeys.has(key)) pinnedKeys.delete(key);
  }
}

/**
 * Full-viewport, opacity 0, parented to #warm-video-layer (z-0).
 * The React app sits at z-1 so chrome always paints above this frame.
 * Zero-size iframes never actually buffer; hover only toggles opacity and play.
 */
function styleWarmVimeo(
  iframe: HTMLIFrameElement,
  fit: "cover" | "contain",
  visible: boolean,
) {
  const opacity = visible ? "1" : "0";
  if (fit === "cover") {
    iframe.style.cssText = `position:absolute;left:50%;top:50%;height:56.25vw;min-height:100%;width:177.78vh;min-width:100%;transform:translate(-50%,-50%);opacity:${opacity};pointer-events:none;border:0;background:#000`;
  } else {
    iframe.style.cssText = `position:absolute;inset:0;width:100%;height:100%;opacity:${opacity};pointer-events:none;border:0;background:#000`;
  }
}

function warmVimeoSrc(url: string, startTime: number): string | null {
  const vimeo = parseVimeoUrl(url);
  if (!vimeo) return null;
  const src = buildVimeoEmbedSrc(vimeo, "background", startTime);
  try {
    const parsed = new URL(src);
    parsed.searchParams.set("api", "1");
    parsed.searchParams.set("autoplay", "1");
    parsed.searchParams.set("muted", "1");
    parsed.searchParams.set("autopause", "0");
    return parsed.toString();
  } catch {
    return src;
  }
}

function ensureWarmVimeo(url: string, startTime = 0): HTMLIFrameElement {
  const key = warmClipKey(url, startTime);
  const existing = warmVimeos.get(key);
  if (existing) {
    touchWarm(key);
    return existing;
  }

  const iframe = document.createElement("iframe");
  iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "";
  iframe.src = warmVimeoSrc(url, startTime) ?? url;
  styleWarmVimeo(iframe, "cover", false);
  warmVideoLayer().appendChild(iframe);

  warmVimeos.set(key, iframe);
  touchWarm(key);
  evictWarmIfNeeded();
  return iframe;
}

function subscribeVimeo(iframe: HTMLIFrameElement) {
  postVimeo(iframe, { method: "addEventListener", value: "ready" });
  postVimeo(iframe, { method: "addEventListener", value: "play" });
  postVimeo(iframe, { method: "addEventListener", value: "timeupdate" });
}

function prepareWarmVimeo(url: string, startTime: number): Promise<void> {
  const key = warmClipKey(url, startTime);
  pinnedKeys.add(key);
  const iframe = ensureWarmVimeo(url, startTime);

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("message", onMessage);
      if (!displayedKeys.has(key)) {
        pinnedKeys.delete(key);
      }
      resolve();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;
      if (event.source !== iframe.contentWindow) return;
      const data = parseVimeoEvent(event.data);
      if (!data) return;

      if (data.event === "ready") {
        subscribeVimeo(iframe);
        if (startTime > 0) {
          postVimeo(iframe, { method: "setCurrentTime", value: startTime });
        }
        postVimeo(iframe, { method: "play" });
        if (startTime <= 0) return;
      }

      if (data.event === "play" && startTime <= 0) {
        finish();
        return;
      }

      if (
        startTime > 0 &&
        data.event === "timeupdate" &&
        data.data &&
        typeof data.data === "object"
      ) {
        const seconds = (data.data as { seconds?: number }).seconds ?? 0;
        if (Math.abs(seconds - startTime) < 2) {
          finish();
        }
      }
    };

    const onLoad = () => {
      subscribeVimeo(iframe);
      if (startTime > 0) {
        postVimeo(iframe, { method: "setCurrentTime", value: startTime });
      }
      postVimeo(iframe, { method: "play" });
    };

    const timeout = setTimeout(finish, PRELOAD_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", onLoad, { once: true });
  }).then(() => {
    if (!displayedKeys.has(key)) {
      postVimeo(iframe, { method: "pause" });
    }
  });
}

/** Preload until the hover clip can start (including Sanity preview start time). */
export function preloadVideoUrl(url: string, startTime = 0): Promise<void> {
  const key = warmClipKey(url, startTime);
  const cached = preloadCache.get(key);
  if (cached) return cached;

  const vimeo = parseVimeoUrl(url);
  const promise = vimeo
    ? prepareWarmVimeo(url, startTime)
    : prepareWarmMp4(url, startTime);

  preloadCache.set(key, promise);
  return promise;
}

/** Mark a URL as already warmed (e.g. idle backdrop is playing it). */
export function markVideoUrlPreloaded(url: string, startTime = 0): void {
  if (!url) return;
  const key = warmClipKey(url, startTime);
  if (preloadCache.has(key)) return;
  preloadCache.set(key, Promise.resolve());
}

/** Take the preloaded MP4 element so hover can play it without a remount. */
export function adoptWarmVideo(url: string, startTime = 0): HTMLVideoElement {
  const key = warmClipKey(url, startTime);
  displayedKeys.add(key);
  pinnedKeys.add(key);
  return ensureWarmVideo(url, startTime);
}

/** Park the hover MP4 so the next reveal of this title is instant. */
export function releaseWarmVideo(
  url: string,
  startTime = 0,
  video: HTMLVideoElement,
): void {
  const key = warmClipKey(url, startTime);
  displayedKeys.delete(key);
  pinnedKeys.delete(key);
  if (warmMp4s.get(key) === video) {
    parkVideo(video);
    return;
  }
  destroyVideo(video);
}

export function adoptWarmVimeo(
  url: string,
  startTime = 0,
): HTMLIFrameElement {
  const key = warmClipKey(url, startTime);
  displayedKeys.add(key);
  pinnedKeys.add(key);
  return ensureWarmVimeo(url, startTime);
}

export function releaseWarmVimeo(
  url: string,
  startTime = 0,
  iframe: HTMLIFrameElement,
  fit: "cover" | "contain" = "cover",
): void {
  const key = warmClipKey(url, startTime);
  displayedKeys.delete(key);
  pinnedKeys.delete(key);
  postVimeo(iframe, { method: "pause" });
  if (warmVimeos.get(key) === iframe) {
    styleWarmVimeo(iframe, fit, false);
    return;
  }
  iframe.remove();
}

export function setWarmVimeoVisible(
  iframe: HTMLIFrameElement,
  fit: "cover" | "contain",
  visible: boolean,
) {
  styleWarmVimeo(iframe, fit, visible);
  postVimeo(iframe, { method: visible ? "play" : "pause" });
}

/** Hide and pause pooled players so list hover clips cannot leak into scroll. */
export function hideWarmMediaOverlays() {
  for (const iframe of warmVimeos.values()) {
    styleWarmVimeo(iframe, "cover", false);
    postVimeo(iframe, { method: "pause" });
  }
  for (const video of warmMp4s.values()) {
    video.pause();
  }
}
