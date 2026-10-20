import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The ds type scale (app/globals.css @theme: text-caption … text-display-lg)
// is registered as font sizes. Without this, tailwind-merge reads e.g.
// `text-body` as a text colour and drops it next to `text-fg-primary`, so the
// element falls back to the inherited 16px.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "body", "body-lg", "title-sm", "title", "headline", "display", "display-lg"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
