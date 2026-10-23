/**
 * An inline script that runs while the browser parses the server HTML,
 * before first paint. React warns when rendering produces a <script> on the
 * client, where it would never run anyway, so the client render marks it
 * text/plain; suppressHydrationWarning accepts the type mismatch. See
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
