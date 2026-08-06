import { BrandHeader } from "./BrandHeader";

type MobileBrandBarProps = {
  /** When set, logo acts as a button (e.g. menu → home). Otherwise links to `/`. */
  onClick?: () => void;
  className?: string;
};

/**
 * Shared mobile top mark — same inset, safe-area, and full-width small logo
 * across Work / Talent / Info / Menu.
 */
export function MobileBrandBar({
  onClick,
  className = "",
}: MobileBrandBarProps) {
  return (
    <div
      className={`relative z-10 shrink-0 px-3 pt-[max(1.25rem,env(safe-area-inset-top))] ${className}`}
    >
      <BrandHeader
        variant="work"
        widthClass="w-full"
        onClick={onClick}
      />
    </div>
  );
}
