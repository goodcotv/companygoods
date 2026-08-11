import Link from "next/link";

export type ViewMode = "scroll" | "list";
export type Section = "work" | "talent" | "info";

type BottomChromeProps = {
  view?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  variant?: "dark" | "over-image";
  activeHref?: "/" | "/talent" | "/info";
  /** `fixed` pins to the viewport; `inline` sits in the shell’s bottom chrome slot. */
  position?: "fixed" | "inline";
  /** SPA navigation callback. If provided, uses buttons instead of Links. */
  onNavigate?: (section: Section) => void;
  /** Active section for SPA mode. Maps to activeHref when onNavigate is used. */
  activeSection?: Section;
  /**
   * Mobile: replace Work/Talent/Info with a single MENU control that opens
   * the fullscreen section menu.
   */
  onMenuOpen?: () => void;
  className?: string;
};

export function BottomChrome({
  view,
  onViewChange,
  variant = "dark",
  activeHref = "/",
  position = "fixed",
  onNavigate,
  activeSection,
  onMenuOpen,
  className = "",
}: BottomChromeProps) {
  const muted = variant === "over-image" ? "text-white/55" : "text-muted";
  const active =
    "text-foreground underline decoration-foreground underline-offset-[5px]";
  
  // Derive active section from activeHref if not explicitly provided
  const currentSection: Section = activeSection ?? 
    (activeHref === "/talent" ? "talent" : activeHref === "/info" ? "info" : "work");
  
  const showViewToggle = currentSection === "work" && view && onViewChange;
  const showMenuButton = Boolean(onMenuOpen);
  // Mobile menu chrome reads larger; desktop stays on the tighter type scale.
  const typeClass = showMenuButton
    ? "text-[15px] tracking-[0.12em]"
    : position === "inline"
      ? "text-[11px] tracking-[0.12em]"
      : "text-[12px] tracking-[0.14em]";

  function navClass(section: Section) {
    return `${currentSection === section ? active : muted} transition-colors hover:text-foreground`;
  }

  function viewClass(mode: ViewMode) {
    return `transition-colors hover:text-foreground ${view === mode ? active : muted}`;
  }

  const shell =
    position === "fixed"
      ? showMenuButton
        ? `pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end gap-8 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:gap-12 md:px-8 md:pb-7 ${
            showViewToggle ? "justify-between" : "justify-end"
          }`
        : "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-end gap-8 px-5 pb-5 md:gap-12 md:px-8 md:pb-7"
      : showMenuButton
        ? `pointer-events-none flex w-full items-end gap-10 ${
            showViewToggle ? "justify-between" : "justify-end"
          }`
        : "pointer-events-none flex items-end justify-start gap-10";

  return (
    <div className={`${shell} ${className}`}>
      {showViewToggle && (
        <div
          className={`pointer-events-auto flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 uppercase ${typeClass}`}
        >
          <button
            type="button"
            onClick={() => onViewChange("scroll")}
            className={viewClass("scroll")}
            aria-pressed={view === "scroll"}
          >
            SCROLL
          </button>
          <span className={muted} aria-hidden>
            /
          </span>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={viewClass("list")}
            aria-pressed={view === "list"}
          >
            LIST
          </button>
        </div>
      )}

      {showMenuButton ? (
        <button
          type="button"
          onClick={onMenuOpen}
          className={`pointer-events-auto rounded-md bg-white/10 px-3 py-1.5 uppercase ${typeClass} text-foreground transition-opacity hover:opacity-70`}
          aria-haspopup="dialog"
        >
          MENU
        </button>
      ) : (
        <nav
          className={`pointer-events-auto flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 uppercase ${typeClass}`}
          aria-label="Primary"
        >
          {onNavigate ? (
            // SPA mode: use buttons with navigation callback
            <>
              <button
                type="button"
                onClick={() => onNavigate("work")}
                className={navClass("work")}
                aria-current={currentSection === "work" ? "page" : undefined}
              >
                WORK
              </button>
              <span className={muted} aria-hidden>
                /
              </span>
              <button
                type="button"
                onClick={() => onNavigate("talent")}
                className={navClass("talent")}
                aria-current={currentSection === "talent" ? "page" : undefined}
              >
                TALENT
              </button>
              <span className={muted} aria-hidden>
                /
              </span>
              <button
                type="button"
                onClick={() => onNavigate("info")}
                className={navClass("info")}
                aria-current={currentSection === "info" ? "page" : undefined}
              >
                INFO
              </button>
            </>
          ) : (
            // Traditional mode: use Next.js Links
            <>
              <Link
                href="/"
                className={navClass("work")}
                aria-current={currentSection === "work" ? "page" : undefined}
              >
                WORK
              </Link>
              <span className={muted} aria-hidden>
                /
              </span>
              <Link
                href="/talent"
                className={navClass("talent")}
                aria-current={currentSection === "talent" ? "page" : undefined}
              >
                TALENT
              </Link>
              <span className={muted} aria-hidden>
                /
              </span>
              <Link
                href="/info"
                className={navClass("info")}
                aria-current={currentSection === "info" ? "page" : undefined}
              >
                INFO
              </Link>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
