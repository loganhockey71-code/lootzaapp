import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalH2, LegalUl } from "@/components/legal/LegalPage";
import { Fill } from "@/components/legal/Fill";
import { LEGAL_BUSINESS_NAME, SUPPORT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/config/legalInfo";

export const metadata: Metadata = { title: "Privacy Policy — Lootza" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_LAST_UPDATED}>
      <p>
        This Privacy Policy explains what information Lootza (&quot;we,&quot; &quot;us&quot;), operated by{" "}
        <Fill>{LEGAL_BUSINESS_NAME}</Fill>, collects, how we use it, and who we share it with.
      </p>

      <section className="flex flex-col gap-3">
        <LegalH2>1. Information we collect</LegalH2>
        <LegalUl>
          <li>
            <strong className="text-ink">Account information:</strong> email address and username, handled via
            Supabase Auth, when you create an account.
          </li>
          <li>
            <strong className="text-ink">Purchase &amp; seller information:</strong> products you buy or list, and,
            for sellers, payout account status via Stripe Connect. We do not store your full card number — payments
            are processed directly by Stripe.
          </li>
          <li>
            <strong className="text-ink">Local browser data:</strong> some in-app activity (likes, saves, the demo
            catalog, gamification progress) is stored only in your browser&apos;s local storage and is never sent to
            our servers.
          </li>
          <li>
            <strong className="text-ink">Usage data:</strong> basic technical information (such as pages visited)
            that we use to operate and improve the service.
          </li>
        </LegalUl>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>2. How we use your information</LegalH2>
        <p>
          We use your information to operate Lootza: authenticate your account, process purchases and payouts,
          deliver digital downloads you&apos;ve purchased, communicate with you about your account or orders, and
          keep the platform secure.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>3. Who we share information with</LegalH2>
        <p>We share information only with the service providers needed to run Lootza:</p>
        <LegalUl>
          <li>
            <strong className="text-ink">Stripe</strong> — processes all payments and seller payouts. See{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              Stripe&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong className="text-ink">Supabase</strong> — provides authentication and database storage for your
            account and purchase records.
          </li>
        </LegalUl>
        <p>We do not sell your personal information.</p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>4. Data retention</LegalH2>
        <p>
          We keep account and purchase records for as long as your account is active, or as needed to comply with
          legal, tax, or accounting obligations.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>5. Your rights</LegalH2>
        <p>
          You can request access to, correction of, or deletion of your personal information by contacting us at{" "}
          <Fill>{SUPPORT_EMAIL}</Fill>. Deleting your account may not immediately remove records we&apos;re required
          to keep for legal or tax purposes.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>6. Children&apos;s privacy</LegalH2>
        <p>Lootza is not directed at children under 13, and we do not knowingly collect information from them.</p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>7. Changes to this policy</LegalH2>
        <p>We may update this Privacy Policy from time to time. Material changes will be reflected by an updated date at the top of this page.</p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>8. Contact</LegalH2>
        <p>
          Questions about this policy? Contact us at <Fill>{SUPPORT_EMAIL}</Fill> or via our{" "}
          <Link href="/contact" className="font-semibold text-primary-600 hover:text-primary-700">
            Contact page
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
