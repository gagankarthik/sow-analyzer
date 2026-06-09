import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Sparkles, FileText, ChevronLeft } from "@/components/ui/icons";
import { PixelArt } from "@/components/landing/PixelArt";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Brand / marketing panel — desktop only. Matches the landing's
          near-black band with coral/periwinkle pixel accents. */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white xl:p-16"
        style={{ background: "#1B1B19" }}
      >
        {/* corner accent dots */}
        <span aria-hidden className="absolute right-10 top-12 h-2.5 w-2.5 rounded-[3px]" style={{ background: "#FF6B81" }} />
        <span aria-hidden className="absolute right-16 top-12 h-2.5 w-2.5 rounded-[3px]" style={{ background: "#8E95E8" }} />

        {/* subtle grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(245,244,240,.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,244,240,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Image src="/logo-icon.svg" alt="" width={24} height={24} priority />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Blue-IQ</span>
              <span className="block font-mono text-[10.5px] text-white/60">Contract Intelligence</span>
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <div className="pix-bob mb-8 inline-block">
            <PixelArt name="reader" color="#FB7AA0" size={88} />
          </div>
          <h2 className="text-[30px] font-semibold leading-[1.12] tracking-tight xl:text-[34px]">
            Turn every contract into an{" "}
            <span className="relative whitespace-nowrap">
              answer
              <span aria-hidden className="absolute -bottom-1 left-0 h-[0.1em] w-full rounded-full" style={{ background: "#FF6B81" }} />
            </span>
            .
          </h2>
          <p className="mt-5 text-[14.5px] leading-relaxed text-white/65">
            Sonar reads your SOWs, MSAs, and amendments — extracting clauses,
            flagging deviations from your playbook, and tracing every change so
            your team moves faster with less risk.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              { icon: FileText, text: "Clause-level extraction across every document type", c: "#FB7AA0" },
              { icon: Sparkles, text: "Playbook deviations surfaced automatically", c: "#8E95E8" },
              { icon: ShieldCheck, text: "SOC 2, GDPR, HIPAA · WCAG 2.1 AA · ADA aligned", c: "#FB7AA0" },
            ].map(({ icon: Icon, text, c }) => (
              <li key={text} className="flex items-center gap-3 text-[13.5px] text-white/85">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: "#262521", color: c }}>
                  <Icon size={14} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-[12px] text-white/55">
          <ShieldCheck size={14} />
          <span>Encrypted at rest &amp; in transit · AES-256 · TLS 1.3</span>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-5 py-6 sm:px-8 sm:py-8">
        {/* Back to home — present on every auth page */}
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
        >
          <ChevronLeft size={15} />
          Back to home
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <Link href="/" className="lg:hidden mb-8 inline-flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-50)]">
              <Image src="/logo-icon.svg" alt="" width={22} height={22} priority />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight text-foreground">Blue-IQ</span>
              <span className="block text-[10.5px] font-mono text-muted-foreground">Contract Intelligence</span>
            </span>
          </Link>
          {children}
        </div>
        </div>
      </main>
    </div>
  );
}
