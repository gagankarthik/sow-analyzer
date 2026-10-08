/* One mark for one platform: the left half is a university (Campus), the
   right half a briefcase (Workforce), meeting on a single seam. Drawn as
   line art on the site's two soft tints, so it sits with the hero shapes. */

export function EditionsMark() {
  return (
    <figure className="lp-emark" aria-label="Govern Campus and Govern Workforce: one platform">
      <svg viewBox="0 0 240 240" className="lp-emark-svg" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="lp-emark-left"><rect x="0" y="0" width="120" height="240" /></clipPath>
          <clipPath id="lp-emark-right"><rect x="120" y="0" width="120" height="240" /></clipPath>
        </defs>

        <circle cx="120" cy="120" r="112" fill="#DCE8FE" clipPath="url(#lp-emark-left)" />
        <circle cx="120" cy="120" r="112" fill="#E9E3FD" clipPath="url(#lp-emark-right)" />

        {/* Campus: half a university building */}
        <g fill="none" stroke="#1F4FB8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M120 60 L52 96 H120" />
          <path d="M60 106 H120" />
          <path d="M70 116 V158 M88 116 V158 M106 116 V158" />
          <path d="M56 168 H120 M48 180 H120" />
        </g>

        {/* Workforce: half a briefcase */}
        <g fill="none" stroke="#5B3CC4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M120 84 H136 a8 8 0 0 1 8 8 V102" />
          <path d="M120 102 H178 a10 10 0 0 1 10 10 V170 a10 10 0 0 1 -10 10 H120" />
          <path d="M120 132 H188" />
          <path d="M120 124 H130 V140 H120" />
        </g>

        <path d="M120 30 V210" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <figcaption className="lp-emark-caption">
        <span><b>Campus</b>Research and licensing</span>
        <span><b>Workforce</b>SOWs and staffing</span>
      </figcaption>
    </figure>
  );
}
