import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { LegalPage, LegalH2 } from "@/components/legal/LegalPage";
import { Fill } from "@/components/legal/Fill";
import { SUPPORT_EMAIL } from "@/lib/config/legalInfo";

export const metadata: Metadata = { title: "Contact — Lootza" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact & Support">
      <p>
        Lootza is a marketplace where independent sellers list and sell digital products directly to buyers. If you
        need help with an order, a payout, a listing, or have a general question, reach out below.
      </p>

      <section className="flex flex-col gap-3">
        <LegalH2>Support email</LegalH2>
        <p className="flex items-center gap-2 text-ink">
          <Mail size={18} className="text-primary-600" aria-hidden />
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary-600 hover:text-primary-700">
            <Fill>{SUPPORT_EMAIL}</Fill>
          </a>
        </p>
        <p>Use this for account issues, order or payout questions, refund requests, or to report a listing that violates our Terms.</p>
      </section>

      <section className="flex flex-col gap-3">
        <LegalH2>Other resources</LegalH2>
        <p>
          Before reaching out, you may find your answer in our{" "}
          <Link href="/terms" className="font-semibold text-primary-600 hover:text-primary-700">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/privacy" className="font-semibold text-primary-600 hover:text-primary-700">
            Privacy Policy
          </Link>
          , or{" "}
          <Link href="/refund-policy" className="font-semibold text-primary-600 hover:text-primary-700">
            Refund Policy
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
