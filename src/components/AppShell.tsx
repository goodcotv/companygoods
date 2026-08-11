"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { BottomChrome } from "./BottomChrome";
import { GoHomeProvider } from "./GoHomeContext";
import { HomePage } from "./HomePage";
import TalentRoster from "./talent/TalentRoster";
import { InfoShell } from "./info/InfoShell";
import { MobileMenu } from "./MobileMenu";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { STAGE_NAV_PADDING } from "@/lib/stage";
import type { HomepageData, PostWorker } from "@/sanity/types";

export type Section = "work" | "talent" | "info";

type AppShellProps = {
  homepageData: HomepageData;
  talentWorkers: PostWorker[];
};

function parseSection(value: string | null): Section {
  if (value === "talent") return "talent";
  if (value === "info") return "info";
  return "work";
}

export function AppShell({ homepageData, talentWorkers }: AppShellProps) {
  const searchParams = useSearchParams();
  const isMobile = useMobileBrowseLayout();
  const [section, setSection] = useState<Section>(() =>
    parseSection(searchParams.get("section")),
  );
  const [menuOpen, setMenuOpen] = useState(false);

  // Open menu when returning from a talent/project page via MENU
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("openMobileMenu") === "1") {
      window.sessionStorage.removeItem("openMobileMenu");
      setMenuOpen(true);
    }
  }, []);

  // Track view state for Work section (scroll/list toggle)
  const [workView, setWorkView] = useState<"scroll" | "list">(() =>
    searchParams.get("view") === "list" ? "list" : "scroll",
  );

  // Sync section state with URL changes
  useEffect(() => {
    setSection(parseSection(searchParams.get("section")));
    if (
      searchParams.get("section") === null ||
      searchParams.get("section") === "work"
    ) {
      setWorkView(searchParams.get("view") === "list" ? "list" : "scroll");
    }
  }, [searchParams]);

  // Navigate to a section by updating URL and state
  function handleNavigate(nextSection: Section) {
    if (nextSection === section) return;

    const params = new URLSearchParams(window.location.search);

    if (nextSection === "work") {
      params.delete("section");
    } else {
      params.set("section", nextSection);
    }

    // Clear section-specific params when changing sections
    if (nextSection !== "talent") {
      params.delete("role");
    }
    if (nextSection !== "info") {
      params.delete("sub");
    }

    const url = params.toString() ? `/?${params.toString()}` : "/";
    window.history.pushState(null, "", url);
    setSection(nextSection);
  }

  // Handle view change for Work section
  function handleWorkViewChange(nextView: "scroll" | "list") {
    setWorkView(nextView);
    const params = new URLSearchParams(window.location.search);

    if (nextView === "list") {
      params.set("view", "list");
    } else {
      params.delete("view");
    }

    const url = params.toString() ? `/?${params.toString()}` : "/";
    window.history.replaceState(null, "", url);
  }

  /** Logo / home — Work section, Scroll view, clear filters. */
  function handleGoHome() {
    setSection("work");
    setWorkView("scroll");
    setMenuOpen(false);
    window.history.pushState(null, "", "/");
  }

  // Handle browser back/forward
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      setSection(parseSection(params.get("section")));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Lock document scroll while the mobile browse shell is active
  useEffect(() => {
    if (!isMobile) return;
    const html = document.documentElement;
    const { body } = document;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
    };
  }, [isMobile]);

  const introVideoUrl = homepageData?.settings?.introVideoUrl;

  const sections = (
    <AnimatePresence mode="popLayout" initial={false}>
      {section === "work" && (
        <HomePage key="work" data={homepageData} externalView={workView} />
      )}

      {section === "talent" && (
        <TalentRoster key="talent" workers={talentWorkers} />
      )}

      {section === "info" && (
        <InfoShell key="info" settings={homepageData.settings} />
      )}
    </AnimatePresence>
  );

  const chrome = (
    <BottomChrome
      position="inline"
      activeSection={section}
      onNavigate={handleNavigate}
      view={section === "work" ? workView : undefined}
      onViewChange={section === "work" ? handleWorkViewChange : undefined}
      onMenuOpen={isMobile ? () => setMenuOpen(true) : undefined}
      className={
        isMobile ? "pointer-events-auto w-full" : "pointer-events-auto"
      }
    />
  );

  let shell: ReactNode;
  if (isMobile) {
    shell = (
      <div className="fixed inset-0 z-0 bg-background text-foreground">
        {/* Full-bleed stage — chrome floats over so media reaches the bottom */}
        <div className="absolute inset-0 overflow-hidden">{sections}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          {chrome}
        </div>
      </div>
    );
  } else {
    shell = (
      <div className="fixed inset-0 z-0 overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 overflow-hidden">{sections}</div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-end justify-end px-8"
          style={{ paddingBottom: STAGE_NAV_PADDING }}
        >
          {chrome}
        </div>
      </div>
    );
  }

  return (
    <GoHomeProvider value={handleGoHome}>
      {shell}

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
        onGoHome={handleGoHome}
        activeSection={section}
        mediaUrl={introVideoUrl}
      />
    </GoHomeProvider>
  );
}
