import { cn, getInitials, hashSeed } from "@/lib/utils";

const PALETTES: [string, string][] = [
  ["#7c3aed", "#ec4899"],
  ["#3b82f6", "#7c3aed"],
  ["#f5810a", "#ec4899"],
  ["#14b8a6", "#3b82f6"],
  ["#a855f7", "#f5810a"],
];

/**
 * Renders a real avatar image when `avatarUrl` is set; otherwise a deterministic
 * gradient + initials avatar generated from `seed`/`name` — swap in a real
 * upload later with no other changes required.
 */
export function CreatorAvatar({
  name,
  seed,
  avatarUrl,
  size = 40,
  className,
}: {
  name: string;
  seed: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external seller-uploaded assets, no static import list
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const h = hashSeed(seed);
  const [c1, c2] = PALETTES[h % PALETTES.length];

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}
