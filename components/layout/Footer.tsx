import Link from "next/link";

const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/contact", label: "Contact" },
];

/** Site-wide legal/support footer — rendered inside the authenticated app shell (AuthGate) and on every standalone page (login, signup, legal pages) so it's reachable whether or not a visitor is signed in. */
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-ink-soft sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Lootza. All rights reserved.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="font-medium hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
