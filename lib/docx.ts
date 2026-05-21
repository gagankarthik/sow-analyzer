// Dependency-free .docx export. A .docx is just a ZIP of XML parts; we build a
// minimal, valid OOXML package and pack it with a stored (uncompressed) ZIP so
// we never need a deflate implementation. Word, Google Docs, and Pages all
// open the result. Browser-only — call the exported helpers from a client.

import { parseMarkdown, spansText, type Block, type Span } from "./markdown";

/* ── ZIP (store method, no compression) ─────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry { name: string; data: Uint8Array; crc: number; offset: number }

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const entries: Entry[] = [];
  let offset = 0;

  const push = (u: Uint8Array) => { chunks.push(u); offset += u.length; };
  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    const crc = crc32(f.data);
    const local = offset;
    push(u32(0x04034b50));            // local file header signature
    push(u16(20));                    // version needed
    push(u16(0));                     // flags
    push(u16(0));                     // compression: store
    push(u16(0)); push(u16(0));       // mod time / date
    push(u32(crc));
    push(u32(f.data.length));         // compressed size
    push(u32(f.data.length));         // uncompressed size
    push(u16(nameBytes.length));
    push(u16(0));                     // extra length
    push(nameBytes);
    push(f.data);
    entries.push({ name: f.name, data: f.data, crc, offset: local });
  }

  const cdStart = offset;
  for (const e of entries) {
    const nameBytes = new TextEncoder().encode(e.name);
    push(u32(0x02014b50));            // central directory header signature
    push(u16(20)); push(u16(20));     // version made by / needed
    push(u16(0)); push(u16(0));       // flags / compression
    push(u16(0)); push(u16(0));       // mod time / date
    push(u32(e.crc));
    push(u32(e.data.length));         // compressed
    push(u32(e.data.length));         // uncompressed
    push(u16(nameBytes.length));
    push(u16(0)); push(u16(0));       // extra / comment length
    push(u16(0)); push(u16(0));       // disk start / internal attrs
    push(u32(0));                     // external attrs
    push(u32(e.offset));              // local header offset
    push(nameBytes);
  }
  const cdSize = offset - cdStart;

  push(u32(0x06054b50));              // end of central directory
  push(u16(0)); push(u16(0));         // disk numbers
  push(u16(entries.length)); push(u16(entries.length));
  push(u32(cdSize));
  push(u32(cdStart));
  push(u16(0));                       // comment length

  const out = new Uint8Array(offset);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

/* ── OOXML parts ────────────────────────────────────────────────── */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function runXml(span: Span): string {
  const rpr: string[] = [];
  if (span.bold) rpr.push("<w:b/>");
  if (span.italic) rpr.push("<w:i/>");
  const props = rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
  return `<w:r>${props}<w:t xml:space="preserve">${esc(span.text)}</w:t></w:r>`;
}

function paraXml(style: string | null, spans: Span[], prefix = ""): string {
  const ppr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  const runs = (prefix ? [{ text: prefix }, ...spans] : spans).map(runXml).join("");
  return `<w:p>${ppr}${runs}</w:p>`;
}

function blockXml(b: Block): string {
  switch (b.type) {
    case "heading":
      return paraXml(`Heading${b.level}`, b.spans);
    case "bullet":
      return paraXml("ListParagraph", b.spans, "•  ");
    case "numbered":
      return paraXml("ListParagraph", b.spans, `${b.index}.  `);
    default:
      return paraXml(null, b.spans);
  }
}

function documentXml(title: string, blocks: Block[]): string {
  const titlePara = title ? paraXml("Title", [{ text: title }]) : "";
  const body = blocks.map(blockXml).join("");
  const sect = `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${titlePara}${body}${sect}</w:body></w:document>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="52"/><w:color w:val="1A1A3A"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="2A2A6E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="180" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="23"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/><w:ind w:left="600"/></w:pPr></w:style>
</w:styles>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

/** Build a .docx Blob from Markdown. The first H1 becomes the document title. */
export function markdownToDocxBlob(markdown: string, fallbackTitle: string): Blob {
  const all = parseMarkdown(markdown);
  // Promote a leading H1 into the styled Title and drop it from the body.
  let title = fallbackTitle;
  let blocks = all;
  if (all[0]?.type === "heading" && all[0].level === 1) {
    title = spansText(all[0].spans) || fallbackTitle;
    blocks = all.slice(1);
  }

  const enc = (s: string) => new TextEncoder().encode(s);
  const zip = zipStore([
    { name: "[Content_Types].xml", data: enc(CONTENT_TYPES) },
    { name: "_rels/.rels", data: enc(ROOT_RELS) },
    { name: "word/document.xml", data: enc(documentXml(title, blocks)) },
    { name: "word/_rels/document.xml.rels", data: enc(DOC_RELS) },
    { name: "word/styles.xml", data: enc(STYLES_XML) },
  ]);

  // Copy into a fresh ArrayBuffer so the Blob isn't a view over a larger buffer.
  return new Blob([zip.slice().buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/** Trigger a browser download of the Markdown rendered as a .docx file. */
export function downloadDocx(markdown: string, filenameBase: string): void {
  const blob = markdownToDocxBlob(markdown, filenameBase);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "sow"}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
