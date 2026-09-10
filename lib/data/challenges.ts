import type { Challenge } from "@/lib/types";

export const challenges: Challenge[] = [
  {
    id: "daily-watch",
    scope: "daily",
    title: "Browse the feed",
    description: "Watch 5 Discover posts or videos.",
    goalType: "watch-discover",
    goalCount: 5,
    rewardXp: 40,
    rewardCoins: 15,
  },
  {
    id: "daily-like",
    scope: "daily",
    title: "Show some love",
    description: "Like 3 products.",
    goalType: "like-product",
    goalCount: 3,
    rewardXp: 30,
    rewardCoins: 10,
  },
  {
    id: "weekly-post",
    scope: "weekly",
    title: "Go live",
    description: "Post a video to Discover.",
    goalType: "post-video",
    goalCount: 1,
    rewardXp: 150,
    rewardCoins: 60,
  },
  {
    id: "weekly-upload",
    scope: "weekly",
    title: "Drop something new",
    description: "Upload a product to your shop.",
    goalType: "upload-product",
    goalCount: 1,
    rewardXp: 200,
    rewardCoins: 80,
  },
  {
    id: "weekly-sale",
    scope: "weekly",
    title: "Make a sale",
    description: "Complete a purchase on the marketplace.",
    goalType: "make-sale",
    goalCount: 1,
    rewardXp: 120,
    rewardCoins: 50,
  },
  {
    id: "weekly-review",
    scope: "weekly",
    title: "Share your thoughts",
    description: "Leave a review on something you own.",
    goalType: "leave-review",
    goalCount: 1,
    rewardXp: 80,
    rewardCoins: 30,
  },
];

export function getChallenge(id: string) {
  return challenges.find((c) => c.id === id);
}
