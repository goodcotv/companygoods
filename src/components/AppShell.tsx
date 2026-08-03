"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { ScaleToFit } from "./ScaleToFit";
import { BrandHeader } from "./BrandHeader";
import { BottomChrome } from "./BottomChrome";
import { HomePage } from "./HomePage";
import TalentRoster from "./talent/TalentRoster";
import { InfoShell } from "./info/InfoShell";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/stage";
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
  const [section, setSection] = useState<Section>(() =>
    parseSection(searchParams.get("section")),
  );
  
  // Track view state for Work section (scroll/list toggle)
  const [workView, setWorkView] = useState<"scroll" | "list">(() =>
    searchParams.get("view") === "list" ? "list" : "scroll"
  );

  // Sync section state with URL changes
  useEffect(() => {
    setSection(parseSection(searchParams.get("section")));
    if (searchParams.get("section") === null || searchParams.get("section") === "work") {
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

  // Handle browser back/forward
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      setSection(parseSection(params.get("section")));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <LayoutGroup>
      <ScaleToFit width={STAGE_WIDTH} height={STAGE_HEIGHT}>
        <div
          className="relative bg-background text-foreground"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
        >
          {/* Content sections with page transitions */}
          <AnimatePresence mode="popLayout" initial={false}>
            {section === "work" && (
              <HomePage 
                key="work"
                data={homepageData} 
                onNavigate={handleNavigate}
                externalView={workView}
                onExternalViewChange={handleWorkViewChange}
              />
            )}
            
            {section === "talent" && (
              <TalentRoster key="talent" workers={talentWorkers} onNavigate={handleNavigate} />
            )}
            
            {section === "info" && (
              <InfoShell key="info" onNavigate={handleNavigate} />
            )}
          </AnimatePresence>

          {/* Persistent bottom navigation - never unmounts */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-end justify-end px-8 pb-7">
            <BottomChrome
              position="inline"
              activeSection={section}
              onNavigate={handleNavigate}
              view={section === "work" ? workView : undefined}
              onViewChange={section === "work" ? handleWorkViewChange : undefined}
              className="pointer-events-auto"
            />
          </div>
        </div>
      </ScaleToFit>
    </LayoutGroup>
  );
}
