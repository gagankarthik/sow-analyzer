// Allowlist sanitiser for HTML converted from an uploaded .docx. The converter
// (mammoth) escapes text but passes link targets through untouched, so a
// document can carry a `javascript:` link. Browser-only.
//
// The markup is parsed into an inert document (nothing runs, nothing loads) and
// rebuilt from scratch: only known tags are recreated, only known attributes
// are copied, and unknown wrappers are replaced by their children.

const KEEP = new Set([
  "p", "br", "hr", "div", "span", "blockquote", "pre", "code",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "sup", "sub",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "a", "img",
]);

// Removed together with everything inside them.
const DROP = new Set([
  "script", "style", "iframe", "object", "embed", "template", "noscript",
  "svg", "math", "form", "input", "button", "select", "textarea",
  "link", "meta", "base", "title", "head", "frame", "frameset", "applet",
  "audio", "video", "source", "track", "canvas",
]);

const SAFE_LINK = /^(?:https?:|mailto:)/i;
const SAFE_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i;
const SPAN = /^[1-9]\d{0,2}$/;

function rebuild(source: Node, target: Node, doc: Document): void {
  source.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(node.textContent ?? ""));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP.has(tag)) return;

    const clean = cleanElement(el, tag, doc);
    if (!clean) {
      rebuild(el, target, doc); // unknown or unsafe wrapper: keep its content only
      return;
    }
    rebuild(el, clean, doc);
    target.appendChild(clean);
  });
}

/** A fresh element carrying only safe attributes, or null to unwrap the tag. */
function cleanElement(el: Element, tag: string, doc: Document): HTMLElement | null {
  if (!KEEP.has(tag)) return null;

  if (tag === "a") {
    const href = (el.getAttribute("href") ?? "").trim();
    if (!SAFE_LINK.test(href)) return null;
    const a = doc.createElement("a");
    a.setAttribute("href", href);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer nofollow");
    return a;
  }

  if (tag === "img") {
    const src = (el.getAttribute("src") ?? "").trim();
    if (!SAFE_IMAGE.test(src)) return null;
    const img = doc.createElement("img");
    img.setAttribute("src", src);
    img.setAttribute("alt", el.getAttribute("alt") ?? "");
    return img;
  }

  const clean = doc.createElement(tag);
  if (tag === "td" || tag === "th") {
    for (const name of ["colspan", "rowspan"]) {
      const value = el.getAttribute(name) ?? "";
      if (SPAN.test(value)) clean.setAttribute(name, value);
    }
  }
  return clean;
}

/** Sanitise converted document HTML for use with dangerouslySetInnerHTML. */
export function sanitizeDocumentHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const doc = document.implementation.createHTMLDocument("");
  const root = doc.createElement("div");
  rebuild(parsed.body, root, doc);
  return root.innerHTML;
}
