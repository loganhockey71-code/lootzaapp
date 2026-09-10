import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalH2, LegalUl } from "@/components/legal/LegalPage";
import { Fill } from "@/components/legal/Fill";
import { SUPPORT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/config/legalInfo";

export const metadata: Metadata = { title: "Refund Policy — Lootza" };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" updated={LEGAL_LAST_UPDATED}>
      <p>
        Lootza sells digital products only — there is no physical shipping, and nothing is ever returned by mail.
        Because a digital product can be downloaded or accessed instantly, refunds are handled differently than for
        physical goods, as described below.
      </p>

      <section className="flex flex-col gap-3">
        <LegalH2>1. Digital purchases are generally final</LegalH2>
        <p>
          Once you&apos;ve accessed or downloaded a product, the sale is generally final. Simply changing your mind
          after downloading or accessing a product is not, on its own, grounds for a refund.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>2. When a refund may be granted</LegalH2>
        <p>You may request a refund within <strong className="text-ink">7 days</strong> of purchase if:</p>
        <LegalUl>
          <li>You were charged more than once for the same product (a duplicate charge).</li>
          <li>You were unable to access or download the product due to a technical fault.</li>
          <li>The file you received is corrupt or otherwise unusable.</li>
          <li>The purchase was fraudulent (made without your authorization).</li>
          <li>The product delivered is clearly and materially different from what was listed.</li>
        </LegalUl>
        <p>
          Refunds are reviewed and, where appropriate, issued at Lootza&apos;s discretion. We may ask for details
          (such as a description of the issue) before approving a request.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>3. What isn&apos;t covered</LegalH2>
        <p>
          We generally do not issue refunds for a change of mind, buyer&apos;s remorse, or dissatisfaction with a
          product after you&apos;ve already downloaded or accessed it, outside of the cases listed above.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>4. Chargebacks and disputes affect access</LegalH2>
        <p>
          If a purchase is refunded or disputed (for example, via a chargeback with your card issuer), access to the
          purchased product is automatically removed from your account once the refund is processed. If you believe
          this happened in error, contact us at <Fill>{SUPPORT_EMAIL}</Fill> before filing a dispute with your bank,
          so we can try to resolve it directly first.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>5. How to request a refund</LegalH2>
        <p>
          Email <Fill>{SUPPORT_EMAIL}</Fill> or use our{" "}
          <Link href="/contact" className="font-semibold text-primary-600 hover:text-primary-700">
            Contact page
          </Link>{" "}
          with your order details and the reason for your request.
        </p>
      </section>
    </LegalPage>
  );
}
