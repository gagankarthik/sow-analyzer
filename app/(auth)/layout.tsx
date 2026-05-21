import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Sparkles, FileText } from "@/components/ui/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Brand / marketing panel — desktop only */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 text-white"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, var(--brand-primary-500) 0%, var(--brand-primary-700) 45%, var(--brand-primary-900, #0b1b3b) 100%)",
        }}
      >
        {/* subtle grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full blur-3xl opacity-30"
          style={{ background: "var(--ai-ink, #7c5cff)" }}
        />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <Image src="/logo-icon.svg" alt="" width={24} height={24} priority />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Blue-IQ</span>
              <span className="block text-[10.5px] font-mono text-white/70">Contract Intelligence</span>
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[30px] xl:text-[34px] font-semibold leading-[1.15] tracking-tight">
            Turn every contract into an answer.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/80">
            Bluey reads your SOWs, MSAs, and amendments — extracting clauses,
            flagging deviations from your playbook, and tracing every change so
            your team moves faster with less risk.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { icon: FileText, text: "Clause-level extraction across every document type" },
              { icon: Sparkles, text: "Playbook deviations surfaced automatically" },
              { icon: ShieldCheck, text: "Encrypted at rest & in transit · tenant isolation" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13.5px] text-white/90">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/12 backdrop-blur shrink-0">
                  <Icon size={14} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-[12px] text-white/70">
          <ShieldCheck size={14} />
          <span>SOC 2–aligned controls · AES-256 · TLS 1.3</span>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col items-center justify-center px-5 py-10 sm:px-8">
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
      </main>
    </div>
  );
}
