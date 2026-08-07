/** Canonical site-frame size — shared by Work / Talent / Info. */
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

/**
 * Display wordmark width (px). Keep BrandHeader display `widthClass` in sync.
 */
export const DISPLAY_LOGO_WIDTH = 900;

/** Desktop top padding above the shared BrandHeader (Tailwind `pt-4` = 16px). */
export const STAGE_LOGO_TOP_PADDING = 16;

/** BottomChrome padding below the nav text (was Tailwind `pb-7`). */
export const STAGE_NAV_PADDING = 28;
/** Approx height of inline BottomChrome type (`text-[13px]` + underline). */
export const STAGE_NAV_LINE = 18;
/**
 * Distance from stage bottom to the top of the nav text.
 * Scroll camera bottom sits on this line.
 */
export const STAGE_NAV_CLEARANCE = STAGE_NAV_PADDING + STAGE_NAV_LINE;
