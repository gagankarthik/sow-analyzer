import Link from "next/link";

/* Closing call to action — the night surface again, so the page opens and
   closes on the same note. */
export function StartCta() {
  return (
    <section id="start" className="lp-wrap scroll-mt-20 pb-20 md:pb-28">
      <div className="lp-cta px-6 py-16 text-center md:py-24">
        <h2 className="lp-h2 mx-auto max-w-2xl">See Sonar read your hardest contract.</h2>
        <p className="mx-auto mt-4 max-w-md text-lg">
          Upload one document and see every clause rated. Your first analysis is free.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="lp-btn lp-btn-light">
            Start free
          </Link>
          <Link href="/product" className="lp-btn lp-btn-ghost">
            See the product
          </Link>
        </div>
      </div>
    </section>
  );
}
