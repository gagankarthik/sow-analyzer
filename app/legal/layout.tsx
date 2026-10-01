import { MarketingShell } from "@/components/landing/MarketingShell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <div className="lp-wrap pt-28 pb-24 md:pt-40">
        <div className="max-w-3xl">{children}</div>
      </div>
    </MarketingShell>
  );
}
