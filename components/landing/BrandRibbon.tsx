/* The rating ribbon, the site's signature mark: four bands in the four
   colours a clause can be rated (within, fallback, needs changes, not
   acceptable), in the order of the scale. It sweeps behind the hero, every
   inner page's intro and the footer's close. "sweep" rises from the lower
   left to the upper right; "corner" enters from the right edge and curls
   out through the top, for a corner it must not cross. Decorative only;
   the bands draw in once on load (CSS, skipped with reduced motion). */

const BANDS = ["within", "fallback", "deviates", "unacceptable"] as const;
const BAND_WIDTH = 24;
const SHAPES = {
  sweep: { path: "M -60 700 C 380 640 720 330 1260 40", offset: [0, BAND_WIDTH] },
  corner: { path: "M 1260 470 C 960 440 760 300 700 -60", offset: [17, 17] },
} as const;

export function BrandRibbon({ shape = "sweep", className = "" }: { shape?: keyof typeof SHAPES; className?: string }) {
  const { path, offset } = SHAPES[shape];
  return (
    <svg
      className={`site-ribbon ${className}`}
      viewBox="0 0 1200 600"
      preserveAspectRatio={shape === "corner" ? "xMaxYMin slice" : "xMaxYMax slice"}
      aria-hidden="true"
      focusable="false"
    >
      {BANDS.map((band, index) => (
        <path
          key={band}
          className={`site-ribbon-band site-ribbon-${band}`}
          d={path}
          fill="none"
          strokeWidth={BAND_WIDTH}
          transform={`translate(${index * offset[0]} ${index * offset[1]})`}
          pathLength={1}
        />
      ))}
    </svg>
  );
}
