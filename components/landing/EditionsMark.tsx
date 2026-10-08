/* One mark for one platform, drawn as a single line icon: a university
   (Campus) whose roof runs on into the lid of a briefcase (Workforce), the
   two standing on one shared base. The stroke fades from Campus blue to
   Workforce violet, so there is no seam between the halves. */

export function EditionsMark() {
  return (
    <figure className="lp-emark" aria-label="Govern Campus and Govern Workforce: one platform">
      <svg viewBox="0 0 240 240" className="lp-emark-svg" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="lp-emark-bg" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0.2" stopColor="#DCE8FE" />
            <stop offset="0.8" stopColor="#E9E3FD" />
          </linearGradient>
          <linearGradient id="lp-emark-ink" x1="40" y1="0" x2="204" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0.3" stopColor="#1F4FB8" />
            <stop offset="0.7" stopColor="#5B3CC4" />
          </linearGradient>
        </defs>

        <circle cx="120" cy="120" r="112" fill="url(#lp-emark-bg)" />

        <g fill="none" stroke="url(#lp-emark-ink)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          {/* One outline: roof → briefcase lid → right side → shared base */}
          <path d="M36 98 L80 60 L116 91 C121 95 126 98 134 98 H192 A12 12 0 0 1 204 110 V164 A12 12 0 0 1 192 176 H40" />
          {/* Campus: entablature, columns and step */}
          <path d="M46 108 H122" />
          <path d="M58 118 V158 M82 118 V158 M106 118 V158" />
          <path d="M48 166 H134" />
          {/* Workforce: the case's near side, handle, flap and clasp */}
          <path d="M134 98 V176" />
          <path d="M156 98 V90 A8 8 0 0 1 164 82 H174 A8 8 0 0 1 182 90 V98" />
          <path d="M134 130 H204" />
          <path d="M163 124 H175 V138 H163 Z" />
        </g>
      </svg>
      <figcaption className="lp-emark-caption">
        <span><b>Campus</b>Research and licensing</span>
        <span><b>Workforce</b>SOWs and staffing</span>
      </figcaption>
    </figure>
  );
}
