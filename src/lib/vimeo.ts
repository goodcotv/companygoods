export type VimeoVideo = {
  id: string;
  hash?: string;
};

/** Parse vimeo.com or player.vimeo.com URLs */
export function parseVimeoUrl(url: string): VimeoVideo | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "player.vimeo.com") {
      const match = parsed.pathname.match(/\/video\/(\d+)/);
      if (!match) return null;
      return {
        id: match[1],
        hash: parsed.searchParams.get("h") ?? undefined,
      };
    }

    if (host === "vimeo.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "video" && parts[1]) {
        return { id: parts[1], hash: parts[2] };
      }
      if (/^\d+$/.test(parts[0])) {
        return {
          id: parts[0],
          hash: parts[1] || undefined,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isVimeoUrl(url: string): boolean {
  return parseVimeoUrl(url) !== null;
}

/** True for direct video files or Vimeo URLs. */
export function isVideoMediaUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (isVimeoUrl(url)) return true;
  // Strip query/hash so Sanity CDN URLs with params still match.
  const path = url.split(/[?#]/)[0] ?? url;
  return /\.(mp4|webm|mov)$/i.test(path);
}

export function buildVimeoEmbedSrc(
  { id, hash }: VimeoVideo,
  mode: "background" | "controlled" = "background",
  startSeconds?: number,
  origin?: string,
): string {
  const params =
    mode === "controlled"
      ? new URLSearchParams({
          autoplay: "1",
          muted: "1",
          loop: "0",
          background: "0",
          controls: "0",
          title: "0",
          byline: "0",
          portrait: "0",
          transparent: "0",
          playsinline: "1",
          api: "1",
        })
      : new URLSearchParams({
          autoplay: "1",
          muted: "1",
          loop: "1",
          background: "1",
          controls: "0",
          title: "0",
          byline: "0",
          portrait: "0",
          transparent: "0",
        });
  if (hash) params.set("h", hash);
  if (origin) params.set("origin", origin);
  // Custom start: disable autoplay/loop so we can seek then play via the API.
  if (startSeconds && startSeconds > 0 && mode === "background") {
    params.set("autoplay", "0");
    params.set("api", "1");
    params.set("loop", "0");
  }
  const base = `https://player.vimeo.com/video/${id}?${params.toString()}`;
  if (startSeconds && startSeconds > 0) {
    return `${base}#t=${Math.floor(startSeconds)}s`;
  }
  return base;
}
