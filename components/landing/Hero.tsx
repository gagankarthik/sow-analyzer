import Link from "next/link";
import { ProductWindow } from "@/components/landing/ProductWindow";
import { RotatingWord } from "@/components/landing/RotatingWord";
import { SonarField } from "@/components/landing/SonarField";

/* ──────────────────────────────────────────────────────────────
   Hero — the Blue-IQ family look on a light surface: a centred
   statement with one rotating word, two pill actions, then the
   product itself. Behind it, Sonar pings follow the cursor. The window is a working sample that steps through
   the clauses needing review and can be clicked.
   ────────────────────────────────────────────────────────────── */
const DOCUMENTS = ["SOW", "MSA", "amendment", "NDA"];

export function Hero() {
  return (
    <section className="lp-hero pt-32 pb-16 md:pt-40 md:pb-24">
      <SonarField className="lp-field" />
      <div className="lp-wrap">
        <h1 className="lp-h1 lp-hero-title lp-enter mx-auto max-w-4xl">
          Review every <RotatingWord words={DOCUMENTS} /> against your playbook.
        </h1>

        <p className="lp-lede lp-hero-lede lp-enter mt-6" data-step="1">
          Govern reads the whole contract, rates each clause against your standard positions, and
          tells you what to push back on before it is signed.
        </p>

        <div className="lp-enter mt-9 flex flex-wrap justify-center gap-3" data-step="2">
          <Link href="/signup" className="lp-btn lp-btn-primary">
            Start free
          </Link>
          <Link href="#how" className="lp-btn lp-btn-quiet bg-lp-sheet">
            See how Govern works
          </Link>
        </div>

        <div className="lp-frame lp-enter mt-14 md:mt-20" data-step="3">
          <ProductWindow />
        </div>
        <p className="mt-4 text-center text-sm text-lp-ink-3">
          A sample document. Select a clause to see how it was rated.
        </p>
      </div>
    </section>
  );
}
