import { MarketingShell } from "@/components/landing/MarketingShell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <div className="lp-wrap lp-section">
        <div className="max-w-3xl">{children}</div>
      </div>
    </MarketingShell>
  );
}
