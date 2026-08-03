"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BottomChrome } from "@/components/BottomChrome";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/stage";
import { BrandHeader } from "./BrandHeader";

const INFO_SUBNAV = [
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "management", label: "Management" },
] as const;

type InfoSubRoute = typeof INFO_SUBNAV[number]["id"];

const MANAGEMENT = [
  {
    name: "Ralph Miccio",
    title: "Head of Post Production",
    email: "ralph@goodco.tv",
  },
  {
    name: "Matt Lowe",
    title: "Director of Experiential & Technology",
    email: "matt@goodco.tv",
  },
  {
    name: "Ryan Heiferman",
    title: "Co-Founder / Managing Partner",
    email: "ryan@goodco.tv",
  },
];

type InfoShellProps = {
  onNavigate?: (section: "work" | "talent" | "info") => void;
};

function parseSubRoute(value: string | null): InfoSubRoute {
  if (value === "contact") return "contact";
  if (value === "management") return "management";
  return "about";
}

export function InfoShell({ onNavigate }: InfoShellProps) {
  const searchParams = useSearchParams();
  const [activeSubRoute, setActiveSubRoute] = useState<InfoSubRoute>(() =>
    parseSubRoute(searchParams.get("sub")),
  );

  // Sync sub-route with URL
  useEffect(() => {
    setActiveSubRoute(parseSubRoute(searchParams.get("sub")));
  }, [searchParams]);

  function handleSubNav(subRoute: InfoSubRoute) {
    if (subRoute === activeSubRoute) return;

    const params = new URLSearchParams(window.location.search);
    
    if (subRoute === "about") {
      params.delete("sub");
    } else {
      params.set("sub", subRoute);
    }

    params.set("section", "info");
    const url = `/?${params.toString()}`;
    window.history.pushState(null, "", url);
    setActiveSubRoute(subRoute);
  }

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-background px-8 pt-4 pb-7 text-foreground"
      style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
    >
      <BrandHeader variant="display" muted />

      {/* Camera frame: inset from stage edges to match Figma side margins */}
      <div className="relative mt-5 min-h-0 flex-1">
        <AnimatedCornerBrackets inset={0} layoutId="page-corners" />

        <div className="flex h-full items-start gap-16 px-5 py-5">
          <div className="max-w-[30rem]">
            {/* About content */}
            {activeSubRoute === "about" && (
              <p className="font-heading text-[clamp(1rem,2.1vw,1.35rem)] font-extrabold leading-[1.35] tracking-[-0.01em] text-foreground">
                In order to bring to life our clients ambitious creative visions, we
                needed post production workflows that did not exist. So, we built them
                ourselves while developing a talented, tight-knit roster.
              </p>
            )}

            {/* Contact content */}
            {activeSubRoute === "contact" && (
              <div className="flex flex-col gap-8 text-foreground">
                <section className="space-y-1">
                  <h2 className="font-heading text-[clamp(1.1rem,2vw,1.35rem)] font-extrabold tracking-[-0.01em]">
                    Contact
                  </h2>
                  <a
                    href="mailto:post@goodco.tv"
                    className="block font-sans text-[11px] uppercase tracking-[0.06em]"
                  >
                    Post @goodco.tv
                  </a>
                </section>

                <section className="space-y-1">
                  <h2 className="font-heading text-[clamp(1.1rem,2vw,1.35rem)] font-extrabold tracking-[-0.01em]">
                    New York Office
                  </h2>
                  <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[0.06em]">
                    81 Walker St., 1st Floor / New York, NY 10013
                  </p>
                  <a
                    href="tel:+16463899177"
                    className="block font-sans text-[11px] uppercase tracking-[0.06em]"
                  >
                    646.389.9177
                  </a>
                </section>

                <section className="space-y-1">
                  <h2 className="font-heading text-[clamp(1.1rem,2vw,1.35rem)] font-extrabold tracking-[-0.01em]">
                    Los Angeles Office
                  </h2>
                  <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[0.06em]">
                    2825 Glendale Blvd / Los Angeles, CA 90039
                  </p>
                </section>
              </div>
            )}

            {/* Management content */}
            {activeSubRoute === "management" && (
              <ul className="flex flex-col gap-10">
                {MANAGEMENT.map((person) => (
                  <li key={person.email} className="space-y-0.5">
                    <h2 className="font-heading text-[clamp(1.15rem,2.2vw,1.45rem)] font-extrabold tracking-[-0.01em] text-foreground">
                      {person.name}
                    </h2>
                    <p className="font-sans text-[11px] uppercase tracking-[0.06em] text-foreground">
                      {person.title}
                    </p>
                    <a
                      href={`mailto:${person.email}`}
                      className="block font-sans text-[11px] uppercase tracking-[0.06em] text-foreground"
                    >
                      {person.email}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ml-auto shrink-0 pt-1">
            <nav
              className="flex flex-wrap items-center gap-x-1 text-[11px] uppercase tracking-[0.08em]"
              aria-label="Info navigation"
            >
              {INFO_SUBNAV.map((item, index) => {
                const isActive = activeSubRoute === item.id;
                return (
                  <span key={item.id} className="inline-flex items-center gap-x-1">
                    {index > 0 && <span className="text-foreground/80">/</span>}
                    <button
                      type="button"
                      onClick={() => handleSubNav(item.id)}
                      className={
                        isActive
                          ? "text-foreground underline decoration-foreground underline-offset-[5px]"
                          : "text-muted hover:text-foreground"
                      }
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.label}
                    </button>
                  </span>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <footer className="mt-5 flex shrink-0 items-end justify-between gap-8">
        <p className="max-w-md text-[10px] uppercase leading-relaxed tracking-[0.06em] text-foreground">
          Website Design + Production:{" "}
          <span className="underline underline-offset-2">Maya Bormann</span>{" "}
          and{" "}
          <span className="underline underline-offset-2">Nina Lu</span>
          <br />
          Development by{" "}
          <span className="underline underline-offset-2">Emily Whitney</span>
        </p>
      </footer>
    </motion.div>
  );
}
