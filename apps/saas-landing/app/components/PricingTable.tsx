"use client";

import { useState } from "react";
import Link from "next/link";
import type { Cadence } from "@/lib/types";
import { plans, formatPrice } from "@/lib/plans";
import type { Locale } from "@/lib/i18n";
import { CheckIcon } from "@/app/components/Icon";

interface PricingTableProps {
  lang: Locale;
  labels: {
    monthly: string;
    yearly: string;
    yearlyHint: string;
    perMonth: string;
    mostPopular: string;
    getStarted: string;
    contactSales: string;
  };
}

/**
 * Interactive pricing table with a monthly/yearly cadence toggle.
 * Prices are computed client-side from the shared `plans` data + Intl.
 */
export function PricingTable({ lang, labels }: PricingTableProps) {
  const [cadence, setCadence] = useState<Cadence>("monthly");

  return (
    <div>
      <div
        className="cadence-toggle"
        role="group"
        aria-label="Billing cadence"
        style={{ display: "flex", alignItems: "center", marginInline: "auto", width: "fit-content" }}
      >
        <button
          type="button"
          aria-pressed={cadence === "monthly"}
          onClick={() => setCadence("monthly")}
        >
          {labels.monthly}
        </button>
        <button
          type="button"
          aria-pressed={cadence === "yearly"}
          onClick={() => setCadence("yearly")}
        >
          {labels.yearly}
          <span className="cadence-hint">{labels.yearlyHint}</span>
        </button>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const price = formatPrice(plan, cadence, lang);
          const isSales = plan.ctaKind === "sales";
          return (
            <div
              key={plan.id}
              className={`plan${plan.highlighted ? " is-highlighted" : ""} fade-up`}
            >
              {plan.highlighted ? <span className="plan-flag">{labels.mostPopular}</span> : null}
              <h3>{plan.name}</h3>
              <p className="blurb">{plan.blurb[lang]}</p>
              <div className="price">
                {price ?? "—"}
                {price && plan.price[cadence] > 0 ? <small>{labels.perMonth}</small> : null}
              </div>
              <ul>
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <CheckIcon />
                    <span>{feature[lang]}</span>
                  </li>
                ))}
              </ul>
              <Link
                className={`btn cta btn-block ${isSales ? "btn-ghost" : "btn-primary"}`}
                href={`/${lang}/contact?plan=${plan.id}`}
              >
                {isSales ? labels.contactSales : labels.getStarted}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
