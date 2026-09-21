"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { BottomChrome } from "./BottomChrome";
import { consumeGoHomeNavigation, GoHomeProvider, peekGoHomeNavigation } from "./GoHomeContext";
import { HomePage } from "./HomePage";
import TalentRoster from "./talent/TalentRoster";
import { InfoShell } from "./info/InfoShell";
import { InfoCredits } from "./info/InfoCredits";
import {
  MobileMenu,
  MOBILE_MENU_COVER_MS,
  MOBILE_MENU_OVERLAY_FADE_S,
  MOBILE_MENU_REVEAL_EASE,
  MOBILE_MENU_VEIL_IN_MS,
} from "./MobileMenu";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMobileBrowseLayout();
  const [section, setSection] = useState<Section>(() =>
    peekGoHomeNavigation()
      ? "work"
      : parseSection(searchParams.get("section")),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menuCloseTimerRef = useRef<number>(0);
  const menuNavTimerRef = useRef<number>(0);

  // Open menu when returning from a talent/project page via MENU
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("openMobileMenu") === "1") {
      window.sessionStorage.removeItem("openMobileMenu");
      setMenuOpen(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(menuCloseTimerRef.current);
      window.clearTimeout(menuNavTimerRef.current);
    };
  }, []);

  // Track view state for Work section (scroll/list toggle)
  const [workView, setWorkView] = useState<"scroll" | "list">(() =>
    peekGoHomeNavigation()
      ? "scroll"
      : searchParams.get("view") === "list"
        ? "list"
        : "scroll",
  );

  // Sync section state with URL changes
  useLayoutEffect(() => {
    if (consumeGoHomeNavigation()) {
      setSection("work");
      setWorkView("scroll");
      setMenuOpen(false);
      router.replace("/");
      return;
    }
    setSection(parseSection(searchParams.get("section")));
    if (
      searchParams.get("section") === null ||
      searchParams.get("section") === "work"
    ) {
      setWorkView(searchParams.get("view") === "list" ? "list" : "scroll");
    }
  }, [router, searchParams]);

  function closeMenuAfterCover() {
    window.clearTimeout(menuCloseTimerRef.current);
    menuCloseTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
    }, MOBILE_MENU_COVER_MS);
  }

  function willChangeSection(nextSection: Section): boolean {
    if (isMobile && nextSection === "work") {
      return !(section === "work" && workView === "list");
    }
    return nextSection !== section;
  }

  function runAfterVeil(action: () => void) {
    window.clearTimeout(menuNavTimerRef.current);
    menuNavTimerRef.current = window.setTimeout(action, MOBILE_MENU_VEIL_IN_MS);
  }

  /** @returns whether the visible section/view actually changed. */
  function handleNavigate(nextSection: Section): boolean {
    // Mobile: Menu > Work always opens list (logo / landing stays scroll).
    if (isMobile && nextSection === "work") {
      if (section === "work" && workView === "list") return false;

      const params = new URLSearchParams(window.location.search);
      params.delete("section");
      params.set("view", "list");
      params.delete("role");
      params.delete("sub");
      const url = `/?${params.toString()}`;
      window.history.pushState(null, "", url);
      setSection("work");
      setWorkView("list");
      return true;
    }

    if (nextSection === section) return false;

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
    return true;
  }

  function handleMenuNavigate(nextSection: Section): boolean {
    if (!willChangeSection(nextSection)) {
      setMenuOpen(false);
      return false;
    }
    runAfterVeil(() => {
      handleNavigate(nextSection);
    });
    closeMenuAfterCover();
    return true;
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
  function handleGoHome(): boolean {
    const alreadyHome = section === "work" && workView === "scroll";
    const goHome = () => {
      setSection("work");
      setWorkView("scroll");
      window.history.pushState(null, "", "/");
    };

    if (!menuOpen) {
      goHome();
      return false;
    }
    if (alreadyHome) {
      setMenuOpen(false);
      return false;
    }
    runAfterVeil(goHome);
    closeMenuAfterCover();
    return true;
  }

  // Handle browser back/forward
  useEffect(() => {
    function handlePopState() {
      if (peekGoHomeNavigation()) return;
      const params = new URLSearchParams(window.location.search);
      setSection(parseSection(params.get("section")));
      if (params.get("section") === null || params.get("section") === "work") {
        setWorkView(params.get("view") === "list" ? "list" : "scroll");
      }
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

  const sectionKey = section === "work" ? `work-${workView}` : section;

  const activeSection =
    section === "work" ? (
      <HomePage key="work" data={homepageData} externalView={workView} />
    ) : section === "talent" ? (
      <TalentRoster key="talent" workers={talentWorkers} />
    ) : (
      <InfoShell key="info" settings={homepageData.settings} />
    );

  const sections = isMobile ? (
    // Isolate shared layout per section so camera/logo don't morph under the
    // menu overlay. Keep media at full opacity — zeroing it blacks out
    // Vimeo / iOS video. Lists fade via .mobile-stage-ui instead.
    <LayoutGroup id={sectionKey}>
      <div
        className={`absolute inset-0 mobile-stage ${
          menuOpen ? "is-covered" : "is-revealed"
        }`}
      >
        {activeSection}
      </div>
    </LayoutGroup>
  ) : (
    // sync, not popLayout: sections are already absolute, and popLayout
    // races the shared page-corners / logo layoutId against the incoming
    // frame. If that box is measured at 0×0, the morph collapses and the
    // page stays black (talent → info, list → scroll).
    <AnimatePresence initial={false}>
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
      view={section === "work" && !isMobile ? workView : undefined}
      onViewChange={
        section === "work" && !isMobile ? handleWorkViewChange : undefined
      }
      onMenuOpen={isMobile ? () => setMenuOpen(true) : undefined}
      menuOpen={false}
      className={
        isMobile ? "pointer-events-auto w-full" : "pointer-events-auto"
      }
    />
  );

  let shell: ReactNode;
  if (isMobile) {
    shell = (
      <div className="fixed inset-0 z-0 bg-transparent text-foreground">
        {/* Full-bleed stage — chrome floats over so media reaches the bottom */}
        <div className="absolute inset-0 z-0 overflow-hidden">{sections}</div>
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-50 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
          initial={false}
          animate={{
            opacity: menuOpen ? 0 : 1,
            transition: menuOpen
              ? { duration: 0.15, ease: "easeOut" }
              : {
                  duration: MOBILE_MENU_OVERLAY_FADE_S,
                  ease: MOBILE_MENU_REVEAL_EASE,
                },
          }}
        >
          {chrome}
        </motion.div>
      </div>
    );
  } else {
    shell = (
      <div className="fixed inset-0 z-0 overflow-hidden bg-transparent text-foreground">
        <div className="absolute inset-0 z-0 overflow-hidden">{sections}</div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-center px-8"
          style={{ paddingBottom: STAGE_NAV_PADDING }}
        >
          {section === "info" && (
            <div className="pointer-events-auto min-w-0">
              <InfoCredits />
            </div>
          )}
          <div className="ml-auto">{chrome}</div>
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
        onNavigate={handleMenuNavigate}
        onGoHome={handleGoHome}
        activeSection={section}
      />
    </GoHomeProvider>
  );
}
