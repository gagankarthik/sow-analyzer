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
            <Image src="/logo.svg" alt="Blue-IQ" width={113} height={28} priority />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <StatePanel
          art="missing"
          title="This page is not in the contract"
          description="The address may be mistyped, or the page was moved or deleted. Your documents are not affected."
        >
          <Button size="lg" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </StatePanel>
      </main>
    </div>
  );
}
