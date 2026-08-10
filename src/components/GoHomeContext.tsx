"use client";

import { createContext, useContext, type ReactNode } from "react";

const GoHomeContext = createContext<(() => void) | null>(null);

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
