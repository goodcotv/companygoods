export type Discipline = "EDIT" | "COLOR" | "SOUND" | "VFX";
export type Category = "COMMERCIAL" | "IMMERSIVE & LIVE" | "MUSIC" | "BEAUTY";

/** One inline run of text in a Latest Projects subtitle line. */
export type ScrollSubtitleSpan = {
  text: string;
  href?: string;
};

export type Project = {
  id: string;
  client: string;
  title: string;
  category: Category;
  disciplines: Discipline[];
  /** Manually set Latest Projects credit lines (from Sanity postScrollSubtitles). */
  scrollSubtitles?: ScrollSubtitleSpan[][];
  description: string;
  /** Hover video URL, or a still when the project has no clip. */
  image: string;
  imageAlt: string;
  /** Sanity hero still; used under hover video until playback starts. */
  imageUrl?: string;
  /** Sanity poster still; preferred over hero while hover video is warming. */
  posterImageUrl?: string;
  /** Seconds for muted list/scroll/talent preview playback (from Sanity). */
  videoPreviewStartSeconds?: number;
};

export const CATEGORIES: Category[] = [
  "COMMERCIAL",
  "IMMERSIVE & LIVE",
  "MUSIC",
  "BEAUTY",
];

export const DISCIPLINES: Discipline[] = ["EDIT", "COLOR", "SOUND", "VFX"];

export const projects: Project[] = [
  {
    id: "gucci-cruise-27",
    client: "Gucci",
    title: "Cruise Show '27",
    category: "BEAUTY",
    disciplines: ["VFX", "EDIT"],
    scrollSubtitles: [
      [{ text: "VFX/ANIMATION" }],
      [
        { text: "ART DIRECTOR / ANIMATION LEAD: " },
        { text: "JENNI YANG", href: "/talent/jenni-yang?role=vfx" },
      ],
    ],
    description:
      "A cinematic lookbook film for Gucci Cruise '27 — motion graphics, VFX, and editorial finishing across the full show package.",
    image: "/projects/hero-placeholder.jpg",
    imageAlt: "Featured project still",
  },
  {
    id: "grindr-madonna",
    client: "Grindr",
    title: "Confessions with Madonna",
    category: "COMMERCIAL",
    disciplines: ["EDIT", "COLOR", "SOUND"],
    scrollSubtitles: [
      [{ text: "EDITORIAL" }],
      [{ text: "COLOR" }],
      [{ text: "LEAD: ALEX RIVERA" }],
    ],
    description:
      "There should be an option to add a description, which would appear here in a scrollable frame like this. Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Maecenas.",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=80",
    imageAlt: "People gathered around a table in warm light",
  },
  {
    id: "zillow-kacey",
    client: "Zillow",
    title: "Kacey Musgraves",
    category: "MUSIC",
    disciplines: ["EDIT", "COLOR"],
    scrollSubtitles: [[{ text: "EDITORIAL" }], [{ text: "COLOR GRADE" }]],
    description:
      "A music-forward brand film pairing Kacey Musgraves with Zillow's storytelling — edit and color across principal and cutdowns.",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80",
    imageAlt: "Concert stage lights and atmosphere",
  },
  {
    id: "zoom-i-use-zoom",
    client: "Zoom",
    title: "I Use Zoom",
    category: "COMMERCIAL",
    disciplines: ["EDIT", "SOUND", "VFX"],
    scrollSubtitles: [[{ text: "EDITORIAL" }], [{ text: "SOUND DESIGN" }]],
    description:
      "Campaign package for Zoom — editorial, sound design, and finishing across social and broadcast.",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80",
    imageAlt: "Modern office interior with soft light",
  },
  {
    id: "marriott-ncaa",
    client: "Marriott X NCAA",
    title: "Game Day Rituals",
    category: "COMMERCIAL",
    disciplines: ["EDIT", "COLOR"],
    scrollSubtitles: [[{ text: "EDITORIAL" }]],
    description:
      "Game-day rituals across Marriott and NCAA — a multi-spot package spanning lifestyle and sports.",
    image:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=80",
    imageAlt: "Stadium atmosphere during a sporting event",
  },
  {
    id: "oculus-billie",
    client: "Oculus",
    title: "Billie Eilish",
    category: "IMMERSIVE & LIVE",
    disciplines: ["VFX", "EDIT", "SOUND"],
    scrollSubtitles: [[{ text: "VFX" }], [{ text: "IMMERSIVE" }]],
    description:
      "Immersive experience for Oculus featuring Billie Eilish — VFX, edit, and spatial sound.",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80",
    imageAlt: "Live concert crowd and stage lighting",
  },
  {
    id: "waterloo-water-down",
    client: "Waterloo",
    title: "Water Down Nothing",
    category: "COMMERCIAL",
    disciplines: ["EDIT", "COLOR", "SOUND"],
    scrollSubtitles: [[{ text: "EDITORIAL" }], [{ text: "COLOR" }]],
    description:
      "Sparkling water campaign — crisp editorial and color across hero and social cutdowns.",
    image:
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=1600&q=80",
    imageAlt: "Sparkling beverage with condensation",
  },
  {
    id: "samsung-galaxy-pro",
    client: "Samsung",
    title: "Galaxy Pro 2025",
    category: "COMMERCIAL",
    disciplines: ["VFX", "EDIT", "COLOR"],
    scrollSubtitles: [[{ text: "VFX" }], [{ text: "EDITORIAL" }]],
    description:
      "Product launch film for Galaxy Pro 2025 — VFX-led storytelling with editorial and grade.",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1600&q=80",
    imageAlt: "Smartphone product photography",
  },
  {
    id: "canon-love-story",
    client: "Canon",
    title: "Love Story",
    category: "BEAUTY",
    disciplines: ["EDIT", "COLOR"],
    scrollSubtitles: [[{ text: "EDITORIAL" }], [{ text: "COLOR GRADE" }]],
    description:
      "Brand narrative for Canon — a love story told through lens, light, and editorial craft.",
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&q=80",
    imageAlt: "Camera lens close-up with soft bokeh",
  },
];
