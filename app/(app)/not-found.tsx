import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";

// notFound() thrown from any signed-in route renders here, inside the app shell.
export default function AppNotFound() {
  return (
    <StatePanel
      art="missing"
      title="We could not find that"
      description="It may have been deleted, or you may not have access to it. Check the link, or start from one of these."
    >
      <Button size="lg" asChild>
        <Link href="/projects">View projects</Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/library">Open library</Link>
      </Button>
    </StatePanel>
  );
}
