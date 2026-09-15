import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/lib/state/AppStateContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { CookieConsent } from "@/components/layout/CookieConsent";

export const metadata: Metadata = {
  // Resolves relative URLs in per-page metadata (openGraph.images, etc.) into
  // absolute ones — without this, Next warns and social previews can break.
  metadataBase: new URL("https://lootza.vercel.app"),
  title: "Lootza — Create. Drop. Collect.",
  description:
    "The gamified marketplace to discover, buy, collect, and sell digital products — game assets, UI kits, creator tools, and more.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <AppStateProvider>
          <AuthGate>{children}</AuthGate>
        </AppStateProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
