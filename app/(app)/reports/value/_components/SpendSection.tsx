"use client";

// Workforce vendor spend: committed value split by how the work is priced
// (fixed fee or time and materials), and committed value against the
// purchase orders it spends from. Signed and active agreements only.

import { fmtMoney } from "@/lib/contract-value";
import { PRICING_MODEL_LABEL } from "@/lib/govern/labels";
import { isCurrent } from "@/lib/govern/metrics";
import type { Contract, PricingModel } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

type Bucket = PricingModel | "unknown";
const ORDER: Bucket[] = ["fixed_fee", "time_materials", "mixed", "unknown"];
const BUCKET_LABEL: Record<Bucket, string> = { ...PRICING_MODEL_LABEL, unknown: "Pricing not read yet" };

export function spendByPricing(contracts: Contract[], currency: string | null) {
  const committed = contracts.filter((c) => c.direction === "outgoing" && isCurrent(c) && c.value !== null && (!currency || c.currency === currency));
  const rows = ORDER.map((b) => {
    const list = committed.filter((c) => (c.pricingModel ?? "unknown") === b);
    return { bucket: b, count: list.length, amount: list.reduce((s, c) => s + (c.value ?? 0), 0) };
  }).filter((r) => r.count > 0);
  const withPo = committed.filter((c) => c.poAmount != null && c.poAmount > 0);
  const po = {
    count: withPo.length,
    committed: withPo.reduce((s, c) => s + (c.value ?? 0), 0),
    authorised: withPo.reduce((s, c) => s + (c.poAmount ?? 0), 0),
    over: withPo.filter((c) => (c.value ?? 0) > (c.poAmount ?? 0)),
  };
  return { rows, total: rows.reduce((s, r) => s + r.amount, 0), po, missingPo: committed.length - withPo.length };
}

export function SpendSection({ contracts, currency }: { contracts: Contract[]; currency: string | null }) {
  const { rows, total, po, missingPo } = spendByPricing(contracts, currency);
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--ink-600)]">No signed vendor agreements with a value yet. Spend shows here once one is signed.</p>;
  }
  const usedPct = po.authorised > 0 ? Math.round((po.committed / po.authorised) * 100) : null;
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <p className="text-xs font-medium text-[var(--ink-600)]">By pricing</p>
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.bucket}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-foreground">{BUCKET_LABEL[r.bucket]} <span className="text-[var(--ink-600)]">· {r.count}</span></span>
                <span className="font-semibold tabular-nums text-foreground">{fmtMoney(r.amount, currency)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--ink-100)]" aria-hidden>
                <div className={cn("h-full rounded-full", r.bucket === "unknown" ? "bg-[var(--ink-300)]" : "bg-[var(--brand-primary-600)]")}
                  style={{ width: `${total ? Math.max(2, (r.amount / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--ink-600)]">Against purchase orders</p>
        {po.count === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-600)]">No agreement has a purchase order amount yet. Add one in a contract&apos;s details to track spend against it.</p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-[var(--ink-600)]">Committed</dt>
              <dd className="text-xl font-semibold tabular-nums text-foreground">{fmtMoney(po.committed, currency)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--ink-600)]">Purchase orders</dt>
              <dd className="text-xl font-semibold tabular-nums text-foreground">{fmtMoney(po.authorised, currency)}</dd>
            </div>
            <div className="col-span-2 text-sm text-[var(--ink-700)]">
              {usedPct !== null && <>{usedPct}% of the purchase orders is committed.</>}
              {po.over.length > 0 && <span className="text-[var(--danger)]"> {po.over.length} {po.over.length === 1 ? "agreement is" : "agreements are"} over its purchase order.</span>}
              {missingPo > 0 && <span className="text-[var(--ink-600)]"> {missingPo} without a purchase order amount.</span>}
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
