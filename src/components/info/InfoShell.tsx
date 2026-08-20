"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { useMobileBrowseLayout } from "@/hooks/useMobileBrowseLayout";
import { STAGE_FRAME_BOTTOM, STAGE_LOGO_TOP_PADDING } from "@/lib/stage";
import type { PostSiteSettings } from "@/sanity/types";
import { textNav } from "@/lib/typography";
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

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (char) => char.toUpperCase());
}

function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return `tel:${phone}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  return `tel:+${digits}`;
}

/** All-caps address with city/state on its own line (e.g. NEW YORK, NY 10013). */
function formatOfficeAddress(address: string): string {
  const lines = address
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 1) {
    const cityMatch = lines[0].match(
      /^(.*?)(?:,\s*|\s+)([A-Za-z][A-Za-z .]*?,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?)\s*$/i,
    );
    if (cityMatch) {
      lines[0] = cityMatch[1].replace(/,\s*$/, "").trim();
      lines.push(cityMatch[2].trim());
    }
  }

  return lines.map((line) => line.toUpperCase()).join("\n");
}

/** Mint ExtraBold — same sizes as web1 info headings / about. */
const textInfoHeading =
  "font-heading text-[calc(17pt-2px)] font-extrabold normal-case leading-[1.05] md:text-[calc(21pt-2px)]";

/** Tighter leading for contact labels and management names. */
const textInfoHeadingCompact =
  "font-heading text-[calc(17pt-2px)] font-extrabold normal-case leading-none md:text-[calc(21pt-2px)]";

/** Tekio Medium — email / titles (uppercase). */
const textInfoUi =
  "font-display text-[calc(11pt-2px)] font-medium uppercase leading-none md:text-[calc(13pt-2px)]";

/** Tekio Medium — addresses & phone; addresses are uppercased in the contact view. */
const textInfoBody =
  "font-display text-[calc(11pt-2px)] font-medium normal-case leading-[1.35] md:text-[calc(13pt-2px)]";

function InfoSubNav({
  activeSubRoute,
  onNavigate,
  className = "",
}: {
  activeSubRoute: InfoSubRoute;
  onNavigate: (subRoute: InfoSubRoute) => void;
  className?: string;
}) {
  return (
    <LayoutGroup>
      <nav
        className={`flex flex-wrap items-center gap-x-1 ${textNav} ${className}`}
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
                className={`relative pb-[5px] transition-colors duration-200 ${
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="info-subnav-underline"
                    className="absolute inset-x-0 bottom-0 h-px bg-foreground"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </button>
            </span>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}

function InfoBody({
  activeSubRoute,
  settings,
}: {
  activeSubRoute: InfoSubRoute;
  settings?: PostSiteSettings;
}) {
  if (activeSubRoute === "about") {
    const paragraphs = settings?.aboutParagraphs?.filter(Boolean) ?? [];

    return (
      <div className="flex flex-col gap-8">
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className={`${textInfoHeading} text-foreground`}
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
      <div className="flex flex-col gap-10 text-foreground">
        {contactEmail && (
          <section>
            <h2 className={textInfoHeadingCompact}>Contact</h2>
            <a
              href={`mailto:${contactEmail}`}
              className={`mt-3 block ${textInfoUi}`}
            >
              {formatContactEmailDisplay(contactEmail)}
            </a>
          </section>
        )}

        {offices.map((office) => (
          <section key={office.label}>
            <h2 className={textInfoHeadingCompact}>{toTitleCase(office.label)}</h2>
            {office.address && (
              <p className={`mt-3 whitespace-pre-line uppercase ${textInfoBody}`}>
                {formatOfficeAddress(office.address)}
              </p>
            )}
            {office.phone && (
              <a
                href={phoneHref(office.phone)}
                className={`mt-2 block ${textInfoBody}`}
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
        <li key={person.email || person.name}>
          <h2 className={`${textInfoHeadingCompact} text-foreground`}>
            {person.name}
          </h2>
          {person.title && (
            <p className={`mt-2 ${textInfoUi} text-foreground`}>
              {person.title}
            </p>
          )}
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className={`mt-2 inline-block text-foreground/80 transition-opacity hover:opacity-70 ${textInfoUi}`}
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
          />
        </div>

        <div className="relative mx-2 mt-5 min-h-0 flex-1">
          <AnimatedCornerBrackets inset={0} layoutId="page-corners" />
          <div className="h-full overflow-y-auto px-4 py-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeSubRoute}
                className="h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <InfoBody
                  activeSubRoute={activeSubRoute}
                  settings={settings}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <footer className="shrink-0 px-3 pt-4 pb-2">
          <InfoCredits />
        </footer>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-background px-8 text-foreground"
      style={{
        paddingTop: STAGE_LOGO_TOP_PADDING,
        paddingBottom: STAGE_FRAME_BOTTOM,
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
          <div className="flex h-full min-h-0 max-w-[30rem] flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeSubRoute}
                className="flex h-full min-h-0 flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <InfoBody
                  activeSubRoute={activeSubRoute}
                  settings={settings}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="ml-auto shrink-0 pt-1">
            <InfoSubNav
              activeSubRoute={activeSubRoute}
              onNavigate={handleSubNav}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
