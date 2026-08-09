export type TalentCategory = "editors" | "colorists" | "sound" | "vfx";

export type Talent = {
  id: string;
  name: string;
  /** Roles this person appears under on the roster. */
  categories: TalentCategory[];
  bio: string;
  image: string;
  /** Featured work title shown large behind the bio (no spaces, as on site). */
  workTitle: string;
  workSeason?: string;
};

export const CATEGORIES: { id: TalentCategory; label: string }[] = [
  { id: "editors", label: "EDITORS" },
  { id: "colorists", label: "COLORISTS" },
  { id: "sound", label: "SOUND" },
  { id: "vfx", label: "VFX" },
];

/** Unique people — multi-role folks list multiple categories. */
export const TALENT: Talent[] = [
  {
    id: "andrew-morrow",
    name: "Andrew Morrow",
    categories: ["editors"],
    bio: "Andrew brings a narrative instinct to every cut — shaping commercials and music films with clarity, rhythm, and emotional weight.",
    image: "/talent-placeholder.jpg",
    workTitle: "ROOMTOMOVE",
  },
  {
    id: "alexander-hammer",
    name: "Alexander Hammer",
    categories: ["editors"],
    bio: "Alex is a former VMA Best Editor winner (Beyonce's 'Countdown') as well as being Beyonce's preferred editor for several years. He's also had the pleasure of editing videos and concert films for the like of Madonna, Lizzo, Selena Gomez, Jay Z, Katy Perry, and more. More recently he's focused on documentary directing/editing w/ the films Expecting Amy and Room to Move.",
    image: "/talent-placeholder.jpg",
    workTitle: "NEWYORKCITYBALLET",
    workSeason: "19 — 20 SEASON",
  },
  {
    id: "catherine-gionfriddo",
    name: "Catherine Gionfriddo",
    categories: ["editors"],
    bio: "Catherine edits with a sharp sense of story and tone, spanning branded content, music videos, and documentary features.",
    image: "/talent-placeholder.jpg",
    workTitle: "COUNTDOWN",
  },
  {
    id: "chaz-smedley",
    name: "Chaz Smedley",
    categories: ["editors"],
    bio: "Chaz is a versatile editor whose work balances energy and restraint across commercial and entertainment projects.",
    image: "/talent-placeholder.jpg",
    workTitle: "CONFESSIONS",
  },
  {
    id: "drew-horen",
    name: "Drew Horen",
    categories: ["editors"],
    bio: "Drew crafts edits that feel intentional and kinetic — from high-profile music videos to polished brand campaigns.",
    image: "/talent-placeholder.jpg",
    workTitle: "CRUISESHOW",
  },
  {
    id: "evan-newman",
    name: "Evan Newman",
    categories: ["editors"],
    bio: "Evan specializes in character-driven storytelling, with a portfolio spanning music, fashion, and long-form documentary.",
    image: "/talent-placeholder.jpg",
    workTitle: "MUSGRAVES",
  },
  {
    id: "jerry-chia",
    name: "Jerry Chia",
    categories: ["editors"],
    bio: "Jerry edits with meticulous attention to detail and a strong sense of visual rhythm across commercial and music work.",
    image: "/talent-placeholder.jpg",
    workTitle: "BEAUTYFILM",
  },
  {
    id: "loic-maes",
    name: "Loic Maes",
    categories: ["editors", "colorists"],
    bio: "Loic brings an international sensibility to the cutting room, shaping films and spots with elegance and pace.",
    image: "/talent-placeholder.jpg",
    workTitle: "LIVETOUR",
  },
  {
    id: "maxime-quoilin",
    name: "Maxime Quoilin",
    categories: ["editors"],
    bio: "Maxime is an editor known for precise pacing and a cinematic eye across music videos, commercials, and long-form documentary work.",
    image: "/talent-placeholder.jpg",
    workTitle: "EXPECTINGAMY",
  },
  {
    id: "nuno-xico",
    name: "Nuno Xico",
    categories: ["editors"],
    bio: "Nuno is known for bold, stylish cuts that elevate music videos and high-end commercial campaigns.",
    image: "/talent-placeholder.jpg",
    workTitle: "MUSICVIDEO",
  },
  {
    id: "nathan-rodriguez",
    name: "Nathan Rodriguez",
    categories: ["editors", "vfx"],
    bio: "Nathan edits with clarity and momentum, delivering polished work across entertainment and branded storytelling.",
    image: "/talent-placeholder.jpg",
    workTitle: "BRANDFILM",
  },
  {
    id: "matteo-belletta",
    name: "Matteo Belletta",
    categories: ["editors", "colorists"],
    bio: "Matteo is an Emmy Award winning Editor whose recent work includes HBO's Expecting Amy, Amazon's Room to Move, and Apple's Dear… starring Oprah Winfrey. His commercial work includes campaigns for Nike, Adidas, Apple, Beats, and more. Matteo's music video credits include videos for Beyonce, Jay Z, Kanye West, Drake, and many others.",
    image: "/talent-placeholder.jpg",
    workTitle: "EXPECTINGAMY",
  },
  {
    id: "ron-sudul",
    name: "Ron Sudul",
    categories: ["colorists"],
    bio: "Ron is a colorist known for rich, cinematic grades across commercials, music videos, and long-form storytelling — always in service of mood and narrative.",
    image: "/talent-placeholder.jpg",
    workTitle: "LOOKBOOK",
  },
  {
    id: "sean-henderson",
    name: "Sean Henderson",
    categories: ["colorists"],
    bio: "Sean brings a precise eye for palette and contrast, crafting distinctive looks for brands, artists, and filmmakers.",
    image: "/talent-placeholder.jpg",
    workTitle: "GRADEONE",
  },
  {
    id: "nick-montgomery",
    name: "Nick Montgomery",
    categories: ["sound"],
    bio: "",
    image: "/talent-placeholder.jpg",
    workTitle: "",
  },
  {
    id: "jenni-yang",
    name: "Jenni Yang",
    categories: ["vfx"],
    bio: "",
    image: "/talent-placeholder.jpg",
    workTitle: "",
  },
  {
    id: "tamara-hahn",
    name: "Tamara Hahn",
    categories: ["vfx"],
    bio: "",
    image: "/talent-placeholder.jpg",
    workTitle: "",
  },
];

export function getTalentByCategory(category: TalentCategory): Talent[] {
  return TALENT.filter((person) => person.categories.includes(category));
}
