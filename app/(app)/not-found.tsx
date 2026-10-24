import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";

// notFound() thrown from any signed-in route renders here, inside the app shell.
export default function AppNotFound() {
  return (
    <StatePanel
      art="missing"
      title="Page not found"
      description="It was deleted, or you don't have access."
    >
      <Button asChild>
        <Link href="/contracts">Contracts</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/dashboard">Dashboard</Link>
      </Button>
    </StatePanel>
  );
}
