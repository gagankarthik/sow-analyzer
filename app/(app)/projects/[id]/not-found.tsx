import Link from "next/link";
import { ChevronLeft, Briefcase } from "@/components/ui/icons";

export default function ProjectNotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
        <Briefcase size={24} strokeWidth={1.5} />
      </span>
      <h1
        className="text-foreground"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.025em",
        }}
      >
        Project not found
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">
        This engagement may have been archived, or the link is out of date.
        Head back to your projects to find it.
      </p>
      <Link
        href="/projects"
        className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-[13px] font-semibold transition-colors"
      >
        <ChevronLeft size={14} />
        Back to projects
      </Link>
    </div>
  );
}
