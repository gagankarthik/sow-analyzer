// Renders the small Markdown subset (lib/markdown) as styled, document-like
// JSX for the SOW preview. Headings, paragraphs, bullet/numbered lists, and
// bold/italic — matching what the .docx exporter produces.

import { parseMarkdown, type Block, type Span } from "@/lib/markdown";
import { cn } from "@/lib/utils";

function Inline({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.bold) return <strong key={i} className="font-semibold text-foreground">{s.text}</strong>;
        if (s.italic) return <em key={i}>{s.text}</em>;
        return <span key={i}>{s.text}</span>;
      })}
    </>
  );
}

export function MarkdownView({ markdown, className }: { markdown: string; className?: string }) {
  const blocks = parseMarkdown(markdown);

  // Group consecutive list items so they share one <ul>/<ol>.
  const out: React.ReactNode[] = [];
  let run: { type: "bullet" | "numbered"; items: Block[] } | null = null;
  const flush = () => {
    if (!run) return;
    const items = run.items.map((b, i) => (
      <li key={i} className="leading-[1.65]"><Inline spans={b.spans} /></li>
    ));
    out.push(
      run.type === "bullet" ? (
        <ul key={out.length} className="my-3 ml-5 list-disc space-y-1.5 text-base text-[var(--ink-700)] marker:text-[var(--brand-primary-600)]">{items}</ul>
      ) : (
        <ol key={out.length} className="my-3 ml-5 list-decimal space-y-1.5 text-base text-[var(--ink-700)] marker:font-medium marker:text-muted-foreground">{items}</ol>
      ),
    );
    run = null;
  };

  for (const b of blocks) {
    if (b.type === "bullet" || b.type === "numbered") {
      if (!run || run.type !== b.type) { flush(); run = { type: b.type, items: [] }; }
      run.items.push(b);
      continue;
    }
    flush();
    if (b.type === "heading") {
      if (b.level === 1) out.push(<h1 key={out.length} className="text-2xl font-semibold mt-1 mb-4 border-b border-border pb-4 leading-tight tracking-tight text-foreground"><Inline spans={b.spans} /></h1>);
      else if (b.level === 2) out.push(<h2 key={out.length} className="text-lg font-semibold mt-7 mb-2 tracking-tight text-foreground"><Inline spans={b.spans} /></h2>);
      else out.push(<h3 key={out.length} className="text-base font-semibold mt-4 mb-1.5 text-foreground"><Inline spans={b.spans} /></h3>);
    } else {
      out.push(<p key={out.length} className="my-2.5 text-base leading-[1.7] text-[var(--ink-700)]"><Inline spans={b.spans} /></p>);
    }
  }
  flush();

  return <div className={cn("max-w-[58ch] break-words", className)}>{out}</div>;
}
