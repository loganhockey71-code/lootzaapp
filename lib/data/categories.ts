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
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
