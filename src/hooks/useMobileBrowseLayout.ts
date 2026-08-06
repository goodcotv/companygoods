import { useCoarsePointerDevice } from "./useCoarsePointerDevice";

/**
 * True on touch / coarse-pointer devices — mobile browse + menu layouts.
 * Prefer this over a width breakpoint so iPads / touch laptops get the
 * mobile chrome regardless of viewport size.
 */
export function useMobileBrowseLayout() {
  return useCoarsePointerDevice();
}
