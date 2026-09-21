import type { Category } from "@/lib/types";

export const categories: Category[] = [
  {
    slug: "gaming",
    name: "Gaming",
    description: "Icon packs, HUDs, RPG assets & game-ready kits",
    accent: "#7c3aed",
  },
  {
    slug: "graphics",
    name: "Graphics",
    description: "UI kits, textures, mockups & design assets",
    accent: "#a855f7",
  },
  {
    slug: "social",
    name: "Social",
    description: "Overlays, story templates & caption packs",
    accent: "#f5810a",
  },
  {
    slug: "web",
    name: "Web",
    description: "Site templates, dashboards & landing kits",
    accent: "#3b82f6",
  },
  {
    slug: "creator",
    name: "Creator",
    description: "Notion OS, brand kits & workflow templates",
    accent: "#ec4899",
  },
  {
    slug: "ai",
    name: "AI",
    description: "Prompt vaults, avatar packs & AI toolkits",
    accent: "#14b8a6",
  },
  {
    slug: "ebooks",
    name: "eBooks",
    description: "Guides, ebooks, workbooks & written resources",
    accent: "#0ea5e9",
  },
  {
    slug: "courses",
    name: "Courses",
    description: "Video courses, lessons, tutorials & coaching packs",
    accent: "#f59e0b",
  },
  {
    slug: "music",
    name: "Music & Audio",
    description: "Beats, samples, sound effects & loops",
    accent: "#8b5cf6",
  },
  {
    slug: "video",
    name: "Video & Footage",
    description: "Stock footage, LUTs, transitions & motion templates",
    accent: "#ef4444",
  },
  {
    slug: "photography",
    name: "Photography",
    description: "Stock photos, Lightroom presets & photo packs",
    accent: "#10b981",
  },
  {
    slug: "software",
    name: "Software & Code",
    description: "Apps, plugins, scripts, themes & source code",
    accent: "#2563eb",
  },
  {
    slug: "templates",
    name: "Templates & Docs",
    description: "Spreadsheets, resumes, contracts, planners & documents",
    accent: "#f97316",
  },
  {
    slug: "printables",
    name: "Printables",
    description: "Printable art, planners, worksheets & stickers",
    accent: "#ec4899",
  },
  {
    slug: "fonts",
    name: "Fonts",
    description: "Typefaces, lettering & font families",
    accent: "#64748b",
  },
  {
    slug: "art",
    name: "Art & Illustration",
    description: "Illustrations, 3D models, brushes & digital art",
    accent: "#d946ef",
  },
  {
    slug: "business",
    name: "Business & Finance",
    description: "Business plans, pitch decks, budgets & checklists",
    accent: "#0d9488",
  },
  {
    slug: "other",
    name: "Other",
    description: "Any other digital product that doesn't fit above",
    accent: "#71717a",
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
