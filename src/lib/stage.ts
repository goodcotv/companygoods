/** Desktop top padding above the shared BrandHeader (Tailwind `pt-4` = 16px). */
export const STAGE_LOGO_TOP_PADDING = 16;

/** Desktop gap between display wordmark and slash category nav (Tailwind `mt-8`). */
export const STAGE_LOGO_NAV_GAP_CLASS = "mt-8";

/** BottomChrome padding below the nav text (was Tailwind `pb-7`). */
export const STAGE_NAV_PADDING = 28;
/** Approx height of inline BottomChrome type (`text-[11px]` + underline). */
export const STAGE_NAV_LINE = 16;
/**
 * Distance from stage bottom to the top of the nav text.
 * Used by list/talent layouts that align to the type, not the pill.
 */
export const STAGE_NAV_CLEARANCE = STAGE_NAV_PADDING + STAGE_NAV_LINE;

/** BottomChrome pill (`py-1.5` + 11px type) plus a small gap above it. */
export const STAGE_NAV_PILL = 40;
/**
 * Bottom inset so a full-bleed frame sits above the BottomChrome pill.
 */
export const STAGE_FRAME_BOTTOM = STAGE_NAV_PADDING + STAGE_NAV_PILL;
