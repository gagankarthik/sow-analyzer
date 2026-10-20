import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";

export const metadata: Metadata = { title: "Page not found" };

// Any URL that matches no route. Stands alone (no app shell), since the visitor
// may be signed out.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="app-container flex h-16 items-center">
          <Link href="/" aria-label="Blue-IQ home">
            <Image src="/logo.svg" alt="Blue-IQ" width={107} height={28} priority />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <StatePanel
          art="missing"
          title="Page not found"
          description="The link may be mistyped, or the page has moved."
        >
          <Button size="lg" asChild>
            <Link href="/home">Open workspace</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">Go to website</Link>
          </Button>
        </StatePanel>
      </main>
    </div>
  );
}
