// A deliberately small Markdown model. The model returns the SOW as Markdown;
// we parse it once into block/span structures that both the on-screen preview
// and the .docx exporter render. We only support the subset a SOW needs:
// headings, paragraphs, bullet and numbered lists, and bold/italic inline.

export interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; spans: Span[] }
  | { type: "paragraph"; spans: Span[] }
  | { type: "bullet"; spans: Span[] }
  | { type: "numbered"; index: number; spans: Span[] };

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;

/** Split a line of text into bold/italic spans. */
export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  // Match **bold**, __bold__, *italic*, _italic_ — longest markers first.
  const re = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) });
    if (m[2] != null) spans.push({ text: m[2], bold: true });
    else if (m[4] != null) spans.push({ text: m[4], italic: true });
    last = re.lastIndex;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans.length ? spans : [{ text }];
}

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", spans: parseInline(para.join(" ").trim()) });
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      flushPara();
      blocks.push({ type: "heading", level: h[1].length as 1 | 2 | 3, spans: parseInline(h[2].trim()) });
      continue;
    }
    const b = BULLET.exec(line);
    if (b) {
      flushPara();
      blocks.push({ type: "bullet", spans: parseInline(b[1].trim()) });
      continue;
    }
    const n = NUMBERED.exec(line);
    if (n) {
      flushPara();
      blocks.push({ type: "numbered", index: Number(n[1]), spans: parseInline(n[2].trim()) });
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  return blocks;
}

/** Plain text of a span list — used for the document title heuristic. */
export function spansText(spans: Span[]): string {
  return spans.map((s) => s.text).join("");
}
