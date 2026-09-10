import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalH2, LegalUl } from "@/components/legal/LegalPage";
import { Fill } from "@/components/legal/Fill";
import { LEGAL_BUSINESS_NAME, LEGAL_JURISDICTION, SUPPORT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/config/legalInfo";

export const metadata: Metadata = { title: "Terms of Service — Lootza" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_LAST_UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of Lootza, a marketplace operated by{" "}
        <Fill>{LEGAL_BUSINESS_NAME}</Fill> (&quot;Lootza,&quot; &quot;we,&quot; &quot;us&quot;) where independent
        sellers list and sell digital products directly to buyers. By creating an account or using Lootza, you agree
        to these Terms.
      </p>

      <section className="flex flex-col gap-3">
        <LegalH2>1. What Lootza is</LegalH2>
        <p>
          Lootza is a marketplace platform. Products listed on Lootza are created and sold by independent, third-party
          sellers, not by Lootza itself. Lootza facilitates the listing, discovery, and payment for these products
          (via Stripe — see Section 5) but is not the manufacturer or publisher of seller-listed content.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>2. Accounts</LegalH2>
        <p>
          You must provide accurate information when creating an account and are responsible for all activity under
          your account and for keeping your login credentials secure. You must be able to form a binding contract to
          use Lootza.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>3. Seller obligations</LegalH2>
        <p>If you sell products on Lootza, you agree that:</p>
        <LegalUl>
          <li>You own, or have all necessary rights and licenses to, every product you upload and sell.</li>
          <li>
            You will not upload, list, or sell illegal, pirated, stolen, or infringing content, or content you do not
            have the right to distribute.
          </li>
          <li>Your listings are accurate and not misleading about what a buyer will actually receive.</li>
          <li>You are responsible for the legality and quality of the products you sell.</li>
        </LegalUl>
        <p>
          Lootza may remove any listing, suspend or terminate any account, and withhold payouts connected to content
          that violates these Terms or applicable law, at its discretion.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>4. Buyer terms</LegalH2>
        <p>
          When you buy a product on Lootza, you&apos;re entering into a transaction with the seller for that product,
          facilitated by Lootza. Digital products are licensed for the usage rights stated on the listing (personal
          or commercial use). See our{" "}
          <Link href="/refund-policy" className="font-semibold text-primary-600 hover:text-primary-700">
            Refund Policy
          </Link>{" "}
          for when a purchase is eligible for a refund.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>5. Payments</LegalH2>
        <p>
          All payments on Lootza are processed by Stripe, a third-party payment processor, through Stripe Connect.
          Lootza does not store your full card details. Sellers are paid out via their own connected Stripe account.
          Lootza retains a platform fee on each sale, as disclosed to sellers.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>6. Prohibited conduct</LegalH2>
        <p>
          You may not use Lootza to violate any law, infringe anyone&apos;s intellectual property, upload malware,
          attempt to circumvent payment or content-delivery protections, or abuse, harass, or defraud other users.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>7. Termination</LegalH2>
        <p>
          We may suspend or terminate your access to Lootza at any time for violation of these Terms. You may stop
          using Lootza at any time.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>8. Disclaimers &amp; limitation of liability</LegalH2>
        <p>
          Lootza is provided &quot;as is.&quot; Lootza is not liable for the content, quality, or legality of
          products listed by independent sellers. To the fullest extent permitted by law, Lootza&apos;s liability for
          any claim relating to the service is limited to the amount you paid to Lootza in the preceding 12 months.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>9. Changes to these Terms</LegalH2>
        <p>
          We may update these Terms from time to time. Continued use of Lootza after a change means you accept the
          updated Terms.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>10. Governing law</LegalH2>
        <p>These Terms are governed by the laws of <Fill>{LEGAL_JURISDICTION}</Fill>, without regard to conflict-of-law principles.</p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>11. Contact</LegalH2>
        <p>
          Questions about these Terms? Contact us at <Fill>{SUPPORT_EMAIL}</Fill> or via our{" "}
          <Link href="/contact" className="font-semibold text-primary-600 hover:text-primary-700">
            Contact page
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
