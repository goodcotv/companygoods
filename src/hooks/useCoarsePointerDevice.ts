"use client";

import { useSyncExternalStore } from "react";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return !window.matchMedia(FINE_POINTER_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** True on touch/coarse-pointer devices where we skip the custom cursor. */
export function useCoarsePointerDevice() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
