import { BrandHeader } from "./BrandHeader";

type MobileBrandBarProps = {
  /** When set, logo acts as a button (e.g. menu → home). Else uses AppShell goHome or `/`. */
  onClick?: () => void;
  /** Pass `false` when another brand mark is already on screen (menu overlay). */
  layoutId?: string | false;
  className?: string;
};

/**
 * Shared mobile top mark — same inset, safe-area, and full-width small logo
 * across Work / Talent / Info / Menu.
 */
export function MobileBrandBar({
  onClick,
  layoutId,
  className = "",
}: MobileBrandBarProps) {
  return (
    <div
      className={`relative z-10 shrink-0 px-1.5 pt-[max(0.875rem,env(safe-area-inset-top))] ${className}`}
    >
      <BrandHeader
        variant="work"
        widthClass="w-full"
        onClick={onClick}
        layoutId={layoutId}
      />
    </div>
  );
}
