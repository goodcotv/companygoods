import { buildVimeoEmbedSrc, parseVimeoUrl } from "@/lib/vimeo";

/** Hard cap — always resolve so one bad URL can't freeze the list. */
const PRELOAD_TIMEOUT_MS = 8000;
/** Accept canplay immediately — keep buffering in the background after reveal. */
const CANPLAY_FALLBACK_MS = 0;
const VIMEO_ORIGIN = "https://player.vimeo.com";

/** Session cache so category remounts don't re-wait on already-warmed URLs. */
const preloadCache = new Map<string, Promise<void>>();

function cacheKey(url: string, startTime = 0) {
  return startTime > 0 ? `${url}#t=${startTime}` : url;
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

function postVimeoMessage(
  iframe: HTMLIFrameElement,
  message: Record<string, unknown>,
) {
  iframe.contentWindow?.postMessage(message, "*");
}

/**
 * Warm an MP4 until enough data is buffered for smooth playback.
 * Always resolves (error / timeout / partial buffer) so the list never hangs.
 * Keeps a hidden <video> in the DOM so the download is not aborted on resolve.
 */
function preloadMp4(url: string, startTime = 0): Promise<void> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;bottom:0";

    let settled = false;
    let canplayFallback: number | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (canplayFallback !== undefined) clearTimeout(canplayFallback);
      video.removeEventListener("canplaythrough", onCanPlayThrough);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
      // Leave the element attached so the browser keeps the buffer warm.
      // Do not clear src / call load() — that aborts the download.
      resolve();
    };

    const onCanPlayThrough = () => finish();
    const onCanPlay = () => {
      // Good enough to reveal — keep buffering in the background.
      if (CANPLAY_FALLBACK_MS <= 0) {
        finish();
        return;
      }
      if (canplayFallback === undefined) {
        canplayFallback = window.setTimeout(finish, CANPLAY_FALLBACK_MS);
      }
    };
    const onError = () => finish();

    const onSeeked = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        finish();
        return;
      }
      video.addEventListener("canplaythrough", onCanPlayThrough, { once: true });
      video.addEventListener("canplay", onCanPlay, { once: true });
    };

    const onLoadedMetadata = () => {
      if (startTime <= 0) return;
      const duration = video.duration;
      const target = Number.isFinite(duration)
        ? Math.min(startTime, Math.max(0, duration - 0.05))
        : startTime;
      try {
        video.currentTime = target;
      } catch {
        finish();
      }
    };

    const timeout = setTimeout(finish, PRELOAD_TIMEOUT_MS);

    video.addEventListener("error", onError, { once: true });

    if (startTime > 0) {
      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
      video.addEventListener("seeked", onSeeked, { once: true });
    } else {
      video.addEventListener("canplaythrough", onCanPlayThrough, { once: true });
      video.addEventListener("canplay", onCanPlay, { once: true });
    }

    document.body.appendChild(video);
    video.src = url;
    video.load();
  });
}

/** Warm a Vimeo embed until the player reports play (not just iframe load). */
function preloadVimeoIframe(url: string, startTime = 0): Promise<void> {
  return new Promise((resolve) => {
    const vimeo = parseVimeoUrl(url);
    if (!vimeo) {
      resolve();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-9999px;bottom:0";
    iframe.src = buildVimeoEmbedSrc(vimeo, "background", startTime);
    iframe.allow = "autoplay; fullscreen";

    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      iframe.removeEventListener("load", onLoad);
      // Keep iframe mounted briefly so CDN edge cache stays warm, then remove.
      window.setTimeout(() => iframe.remove(), 2500);
      resolve();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN) return;
      if (event.source !== iframe.contentWindow) return;
      const data = parseVimeoEvent(event.data);
      if (!data) return;

      if (data.event === "ready") {
        if (startTime > 0) {
          postVimeoMessage(iframe, {
            method: "setCurrentTime",
            value: startTime,
          });
        }
        postVimeoMessage(iframe, { method: "play" });
        return;
      }

      if (data.event === "play" || data.event === "playing") {
        finish();
        return;
      }

      // With a custom start, treat near-start timeupdate as ready enough.
      if (
        startTime > 0 &&
        data.event === "timeupdate" &&
        data.data &&
        typeof data.data === "object"
      ) {
        const seconds = (data.data as { seconds?: number }).seconds ?? 0;
        if (Math.abs(seconds - startTime) < 2) finish();
      }
    };

    const onLoad = () => {
      postVimeoMessage(iframe, { method: "addEventListener", value: "ready" });
      postVimeoMessage(iframe, { method: "addEventListener", value: "play" });
      postVimeoMessage(iframe, { method: "addEventListener", value: "playing" });
      if (startTime > 0) {
        postVimeoMessage(iframe, {
          method: "addEventListener",
          value: "timeupdate",
        });
      }
    };

    const timeout = setTimeout(finish, PRELOAD_TIMEOUT_MS);

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", onLoad, { once: true });
    document.body.appendChild(iframe);
  });
}

export function preloadVideoUrl(url: string, startTime = 0): Promise<void> {
  const key = cacheKey(url, startTime);
  const cached = preloadCache.get(key);
  if (cached) return cached;

  const vimeo = parseVimeoUrl(url);
  const promise = vimeo
    ? preloadVimeoIframe(url, startTime)
    : preloadMp4(url, startTime);

  preloadCache.set(key, promise);
  // Also mark the bare URL so remounts without startTime can skip.
  if (startTime > 0 && !preloadCache.has(url)) {
    preloadCache.set(
      url,
      promise.then(() => undefined),
    );
  }
  return promise;
}

/** Mark a URL as already warmed (e.g. backdrop finished loading it). */
export function markVideoUrlPreloaded(url: string, startTime = 0): void {
  if (!url) return;
  const key = cacheKey(url, startTime);
  if (!preloadCache.has(key)) {
    preloadCache.set(key, Promise.resolve());
  }
  if (startTime > 0 && !preloadCache.has(url)) {
    preloadCache.set(url, Promise.resolve());
  }
}
