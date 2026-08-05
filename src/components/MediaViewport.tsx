import { AnimatedCornerBrackets } from "./AnimatedCornerBrackets";
import { VimeoBackground } from "./VimeoBackground";
import { isVimeoUrl } from "@/lib/vimeo";

type MediaViewportProps = {
  title: string;
  className?: string;
  src?: string;
  type?: "video" | "image";
  cornersLayoutId?: string;
};

export function MediaViewport({
  title,
  className = "",
  src,
  type = "video",
  cornersLayoutId = "media-corners",
}: MediaViewportProps) {
  const useVimeo = type === "video" && Boolean(src && isVimeoUrl(src));

  return (
    <div
      className={`relative overflow-hidden rounded-[16px] bg-[#6e6e6e] ${className}`}
      role="img"
      aria-label={src ? `${title} ${type}` : `${title} placeholder`}
    >
      {src ? (
        useVimeo ? (
          <VimeoBackground src={src} title={title} className="h-full w-full" />
        ) : type === "video" ? (
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className="pointer-events-none h-full w-full scale-[1.01] object-cover"
          >
            <track kind="captions" />
          </video>
        ) : (
          <img
            src={src}
            alt={title}
            className="pointer-events-none h-full w-full scale-[1.01] object-cover"
          />
        )
      ) : null}
      <AnimatedCornerBrackets inset={10} layoutId={cornersLayoutId} />
    </div>
  );
}
