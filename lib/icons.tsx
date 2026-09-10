import {
  Gamepad2,
  Palette,
  Smartphone,
  Monitor,
  Sparkles,
  Bot,
  Trophy,
  Package,
  Heart,
  Gem,
  Star,
  CircleDashed,
  Image as ImageIcon,
  Type,
  Wand2,
  Eye,
  Video,
  ShoppingBag,
  MessageCircle,
  CornerDownRight,
  DollarSign,
  ArrowUpCircle,
  Coins,
  Award,
  Gift,
  Zap,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { BadgeId, CategorySlug, ChallengeGoalType, CosmeticType, NotificationType } from "@/lib/types";

/** One icon per marketplace category — used for chips, menus, and generated cover art. */
export const CATEGORY_ICONS: Record<CategorySlug, LucideIcon> = {
  gaming: Gamepad2,
  graphics: Palette,
  social: Smartphone,
  web: Monitor,
  creator: Sparkles,
  ai: Bot,
};

/** One icon per seller achievement badge. */
export const BADGE_ICONS: Record<BadgeId, LucideIcon> = {
  "top-seller": Trophy,
  "product-creator": Package,
  "community-favorite": Heart,
  elite: Gem,
  "rising-star": Star,
};

/** One icon per cosmetic type sold in the Lootza Coins shop. */
export const COSMETIC_TYPE_ICONS: Record<CosmeticType, LucideIcon> = {
  frame: CircleDashed,
  background: ImageIcon,
  title: Type,
  collectible: Gem,
  effect: Wand2,
};

/** One icon per daily/weekly challenge goal type. */
export const CHALLENGE_GOAL_ICONS: Record<ChallengeGoalType, LucideIcon> = {
  "watch-discover": Eye,
  "like-product": Heart,
  "post-video": Video,
  "upload-product": Package,
  "make-sale": ShoppingBag,
  "leave-review": Star,
};

/** One icon per notification type. */
export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  comment: MessageCircle,
  reply: CornerDownRight,
  sale: DollarSign,
  purchase: ShoppingBag,
  follow: UserPlus,
  collaboration: Users,
  leaderboard: Trophy,
  "level-up": ArrowUpCircle,
  coins: Coins,
  achievement: Award,
  "new-drop": Gift,
  "limited-drop": Zap,
};
