"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { STAGE_LOGO_TOP_PADDING } from "@/lib/stage";
import type { PostSiteSettings } from "@/sanity/types";
import { BrandHeader } from "./BrandHeader";
import { MobileBrandBar } from "@/components/MobileBrandBar";
import { InfoCredits } from "./InfoCredits";

const INFO_SUBNAV = [
  { id: "about", label: "ABOUT" },
  { id: "contact", label: "CONTACT" },
  { id: "management", label: "MANAGEMENT" },
] as const;

type InfoSubRoute = (typeof INFO_SUBNAV)[number]["id"];

function parseSubRoute(value: string | null): InfoSubRoute {
  if (value === "contact") return "contact";
  if (value === "management") return "management";
  return "about";
}

/** Formats post@goodco.tv → Post @goodco.tv */
function formatContactEmailDisplay(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.charAt(0).toUpperCase()}${local.slice(1)} @${domain}`;
}

function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return `tel:${phone}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  return `tel:+${digits}`;
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
  settings,
  mobile = false,
}: {
  activeSubRoute: InfoSubRoute;
  settings?: PostSiteSettings;
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
    const paragraphs = settings?.aboutParagraphs?.filter(Boolean) ?? [];
    if (paragraphs.length === 0) return null;

    return (
      <div className="flex flex-col gap-6">
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className={`font-heading ${aboutSize} font-extrabold leading-[1.35] tracking-[-0.01em] text-foreground`}
          >
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  if (activeSubRoute === "contact") {
    const contactEmail = settings?.contactEmail;
    const offices = settings?.offices?.filter((o) => o.label) ?? [];

    if (!contactEmail && offices.length === 0) return null;

    return (
      <div className="flex flex-col gap-8 text-foreground">
        {contactEmail && (
          <section className="space-y-1">
            <h2
              className={`font-heading ${headingSize} font-extrabold uppercase tracking-[-0.01em]`}
            >
              CONTACT
            </h2>
            <a
              href={`mailto:${contactEmail}`}
              className={`block font-sans ${metaSize} uppercase tracking-[0.06em]`}
            >
              {formatContactEmailDisplay(contactEmail)}
            </a>
          </section>
        )}

        {offices.map((office) => (
          <section key={office.label} className="space-y-1">
            <h2
              className={`font-heading ${headingSize} font-extrabold uppercase tracking-[-0.01em]`}
            >
              {office.label}
            </h2>
            {office.address && (
              <p
                className={`font-sans ${metaSize} uppercase leading-relaxed tracking-[0.06em]`}
              >
                {office.address}
              </p>
            )}
            {office.phone && (
              <a
                href={phoneHref(office.phone)}
                className={`block font-sans ${metaSize} uppercase tracking-[0.06em]`}
              >
                {office.phone}
              </a>
            )}
          </section>
        ))}
      </div>
    );
  }

  const management = settings?.management?.filter((p) => p.name) ?? [];
  if (management.length === 0) return null;

  return (
    <ul className="flex flex-col gap-10">
      {management.map((person) => (
        <li key={person.email || person.name} className="space-y-0.5">
          <h2
            className={`font-heading ${nameSize} font-extrabold tracking-[-0.01em] text-foreground`}
          >
            {person.name}
          </h2>
          {person.title && (
            <p
              className={`font-sans ${metaSize} uppercase tracking-[0.06em] text-foreground`}
            >
              {person.title}
            </p>
          )}
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className={`block font-sans ${metaSize} uppercase tracking-[0.06em] text-foreground`}
            >
              {person.email}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

type InfoShellProps = {
  settings?: PostSiteSettings;
};

export function InfoShell({ settings }: InfoShellProps) {
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
            <InfoBody
              activeSubRoute={activeSubRoute}
              settings={settings}
              mobile
            />
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
            <InfoBody activeSubRoute={activeSubRoute} settings={settings} />
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
