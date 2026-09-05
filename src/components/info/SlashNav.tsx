import Link from "next/link";
import { textNav } from "@/lib/typography";

type NavItem = {
  label: string;
  href: string;
};

type SlashNavProps = {
  items: NavItem[];
  activeHref?: string;
  className?: string;
};

export function SlashNav({ items, activeHref, className = "" }: SlashNavProps) {
  return (
    <nav
      className={`flex flex-wrap items-center gap-x-1 ${textNav} ${className}`}
      aria-label="Navigation"
    >
      {items.map((item, index) => {
        const isActive = activeHref === item.href;
        return (
          <span key={item.href} className="inline-flex items-center gap-x-1">
            {index > 0 && <span className="text-foreground/80">/</span>}
            <Link
              href={item.href}
              className={
                isActive
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
