"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { STAGE_HEIGHT, STAGE_LOGO_TOP_PADDING, STAGE_WIDTH } from "@/lib/stage";
import { BrandHeader } from "./BrandHeader";
import { MobileBrandBar } from "@/components/MobileBrandBar";
import { InfoCredits } from "./InfoCredits";

const INFO_SUBNAV = [
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "management", label: "Management" },
] as const;

type InfoSubRoute = (typeof INFO_SUBNAV)[number]["id"];

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

function parseSubRoute(value: string | null): InfoSubRoute {
  if (value === "contact") return "contact";
  if (value === "management") return "management";
  return "about";
}

function InfoSubNav({
  activeSubRoute,
  onNavigate,
  className = "",
  mobile = false,
}: {
  activeSubRoute: InfoSubRoute;
  onNavigate: (subRoute: InfoSubRoute) => void;
  className?: string;
  mobile?: boolean;
}) {
  return (
    <nav
      className={`flex flex-wrap items-center gap-x-1 uppercase tracking-[0.08em] ${
        mobile ? "text-[13px]" : "text-[11px]"
      } ${className}`}
      aria-label="Info navigation"
    >
      {INFO_SUBNAV.map((item, index) => {
        const isActive = activeSubRoute === item.id;
        return (
          <span key={item.id} className="inline-flex items-center gap-x-1">
            {index > 0 && <span className="text-foreground/80">/</span>}
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
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
  );
}

function InfoBody({
  activeSubRoute,
  mobile = false,
}: {
  activeSubRoute: InfoSubRoute;
  mobile?: boolean;
}) {
  const aboutSize = mobile
    ? "text-[clamp(1.2rem,4.8vw,1.55rem)]"
    : "text-[clamp(1rem,2.1vw,1.35rem)]";
  const headingSize = mobile
    ? "text-[clamp(1.3rem,4.8vw,1.65rem)]"
    : "text-[clamp(1.1rem,2vw,1.35rem)]";
  const nameSize = mobile
    ? "text-[clamp(1.35rem,5vw,1.65rem)]"
    : "text-[clamp(1.15rem,2.2vw,1.45rem)]";
  const metaSize = mobile ? "text-[13px]" : "text-[11px]";

  if (activeSubRoute === "about") {
    return (
      <p
        className={`font-heading ${aboutSize} font-extrabold leading-[1.35] tracking-[-0.01em] text-foreground`}
      >
        In order to bring to life our clients&apos; ambitious creative visions, we
        needed post production workflows that did not exist. So, we built them
        ourselves while developing a talented, tight-knit roster.
      </p>
    );
  }

  if (activeSubRoute === "contact") {
    return (
      <div className="flex flex-col gap-8 text-foreground">
        <section className="space-y-1">
          <h2
            className={`font-heading ${headingSize} font-extrabold tracking-[-0.01em]`}
          >
            Contact
          </h2>
          <a
            href="mailto:post@goodco.tv"
            className={`block font-sans ${metaSize} uppercase tracking-[0.06em]`}
          >
            Post @goodco.tv
          </a>
        </section>

        <section className="space-y-1">
          <h2
            className={`font-heading ${headingSize} font-extrabold tracking-[-0.01em]`}
          >
            New York Office
          </h2>
          <p
            className={`font-sans ${metaSize} uppercase leading-relaxed tracking-[0.06em]`}
          >
            81 Walker St., 1st Floor / New York, NY 10013
          </p>
          <a
            href="tel:+16463899177"
            className={`block font-sans ${metaSize} uppercase tracking-[0.06em]`}
          >
            646.389.9177
          </a>
        </section>

        <section className="space-y-1">
          <h2
            className={`font-heading ${headingSize} font-extrabold tracking-[-0.01em]`}
          >
            Los Angeles Office
          </h2>
          <p
            className={`font-sans ${metaSize} uppercase leading-relaxed tracking-[0.06em]`}
          >
            2825 Glendale Blvd / Los Angeles, CA 90039
          </p>
        </section>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-10">
      {MANAGEMENT.map((person) => (
        <li key={person.email} className="space-y-0.5">
          <h2
            className={`font-heading ${nameSize} font-extrabold tracking-[-0.01em] text-foreground`}
          >
            {person.name}
          </h2>
          <p
            className={`font-sans ${metaSize} uppercase tracking-[0.06em] text-foreground`}
          >
            {person.title}
          </p>
          <a
            href={`mailto:${person.email}`}
            className={`block font-sans ${metaSize} uppercase tracking-[0.06em] text-foreground`}
          >
            {person.email}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function InfoShell() {
  const searchParams = useSearchParams();
  const isMobile = useMobileBrowseLayout();
  const [activeSubRoute, setActiveSubRoute] = useState<InfoSubRoute>(() =>
    parseSubRoute(searchParams.get("sub")),
  );

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

  if (isMobile) {
    return (
      <motion.div
        className="absolute inset-0 flex flex-col overflow-hidden bg-background pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <MobileBrandBar />
        <div className="shrink-0 px-3">
          <InfoSubNav
            activeSubRoute={activeSubRoute}
            onNavigate={handleSubNav}
            className="mt-4"
            mobile
          />
        </div>

        <div className="relative mx-2 mt-5 min-h-0 flex-1">
          <AnimatedCornerBrackets inset={0} layoutId="page-corners" />
          <div className="h-full overflow-y-auto px-4 py-5">
            <InfoBody activeSubRoute={activeSubRoute} mobile />
          </div>
        </div>

        <footer className="shrink-0 px-3 pt-4 pb-2">
          <InfoCredits className="text-[12px]" />
        </footer>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-background px-8 pb-7 text-foreground"
      style={{
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        paddingTop: STAGE_LOGO_TOP_PADDING,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
    >
      <BrandHeader variant="display" muted />

      <div className="relative mt-5 min-h-0 flex-1">
        <AnimatedCornerBrackets inset={0} layoutId="page-corners" />

        <div className="flex h-full items-start gap-16 px-5 py-5">
          <div className="max-w-[30rem]">
            <InfoBody activeSubRoute={activeSubRoute} />
          </div>

          <div className="ml-auto shrink-0 pt-1">
            <InfoSubNav
              activeSubRoute={activeSubRoute}
              onNavigate={handleSubNav}
            />
          </div>
        </div>
      </div>

      <footer className="mt-5 flex shrink-0 items-end justify-between gap-8">
        <InfoCredits />
      </footer>
    </motion.div>
  );
}
