import { FloatingNav } from "@/components/landing/FloatingNav";
import { Footer } from "@/components/landing/Footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing relative min-h-screen text-[14px] leading-[1.6] antialiased">
      <FloatingNav />
      <main className="mx-auto max-w-[760px] px-5 pb-24 pt-[120px] md:px-8 md:pt-[140px]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
