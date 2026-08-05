import {
  buildVimeoEmbedSrc,
  parseVimeoUrl,
  type VimeoVideo,
} from "@/lib/vimeo";

type VimeoBackgroundProps = {
  src: string;
  className?: string;
  title?: string;
  /** Fill parent like object-cover (for full-page backgrounds) */
  cover?: boolean;
};

/**
 * Muted looping Vimeo backdrop for hover previews and list backgrounds.
 * Uses Vimeo's background mode (autoplay + loop + no chrome).
 */
export function VimeoBackground({
  src,
  className = "",
  title = "Video",
  cover = true,
}: VimeoBackgroundProps) {
  const video = parseVimeoUrl(src);
  if (!video) return null;

  return (
    <VimeoBackgroundEmbed
      video={video}
      className={className}
      title={title}
      cover={cover}
    />
  );
}

function VimeoBackgroundEmbed({
  video,
  className,
  title,
  cover,
}: {
  video: VimeoVideo;
  className: string;
  title: string;
  cover: boolean;
}) {
  const embedSrc = buildVimeoEmbedSrc(video, "background");

  const iframeClass = cover
    ? "pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
    : "pointer-events-none h-full w-full border-0";

  return (
    <div
      className={`relative overflow-hidden bg-black ${
        cover ? `h-full w-full ${className}` : className
      }`}
      aria-hidden
    >
      <iframe
        src={embedSrc}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        className={iframeClass}
      />
    </div>
  );
}
