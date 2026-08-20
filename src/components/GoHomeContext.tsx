"use client";

import { createContext, useContext, type ReactNode } from "react";

const GoHomeContext = createContext<(() => void) | null>(null);

/** Logo clicks on detail pages (`/talent/...`) set this so AppShell opens landing, not the last SPA section. */
export const GO_HOME_STORAGE_KEY = "goHome";

export function markGoHomeNavigation() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(GO_HOME_STORAGE_KEY, "1");
}

export function consumeGoHomeNavigation() {
  if (typeof window === "undefined") return false;
  if (window.sessionStorage.getItem(GO_HOME_STORAGE_KEY) !== "1") return false;
  window.sessionStorage.removeItem(GO_HOME_STORAGE_KEY);
  return true;
}

export function peekGoHomeNavigation() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(GO_HOME_STORAGE_KEY) === "1";
}

/** Provides SPA home reset for logos inside AppShell (pathname stays `/`). */
export function GoHomeProvider({
  value,
  children,
}: {
  value: () => void;
  children: ReactNode;
}) {
  return (
    <GoHomeContext.Provider value={value}>{children}</GoHomeContext.Provider>
  );
}

export function useGoHome() {
  return useContext(GoHomeContext);
}
