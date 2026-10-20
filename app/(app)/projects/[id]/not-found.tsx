import Link from "next/link";
import { ChevronLeft, Briefcase } from "@/components/ui/icons";

export default function ProjectNotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
        <Briefcase size={24} />
      </span>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Project not found
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
        It may have been deleted, or the link is out of date.
      </p>
      <Link
        href="/projects"
        className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--brand-primary-600)] px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[var(--brand-primary-700)] max-md:h-11"
      >
        <ChevronLeft size={16} aria-hidden />
        Back to projects
      </Link>
    </div>
  );
}
