/* A light, coloured backdrop for the hero: pale flat shapes from the brand
   palette (quarter circles, a square, a ring) sitting at the edges, behind
   the headline and the product card. No gradients, glows or blur. */
export function HeroBackdrop() {
  return (
    <svg
      className="lp-hero3-backdrop"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* A review matrix: wide clause rows split into rating columns. */}
        <pattern id="lp-hero-matrix" width="240" height="48" patternUnits="userSpaceOnUse">
          <path d="M0 47.5 H240 M120 0 V48 M180 0 V48 M239.5 0 V48" fill="none" stroke="#EAE7DF" strokeWidth="1" />
        </pattern>
        <linearGradient id="lp-hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="lp-hero-mask">
          <rect x="0" y="0" width="1440" height="620" fill="url(#lp-hero-fade)" />
        </mask>
      </defs>
      {/* the matrix grid, fading out before the product card */}
      <rect x="0" y="0" width="1440" height="620" fill="url(#lp-hero-matrix)" mask="url(#lp-hero-mask)" />
      {/* left: a blue quarter circle with a sand square tucked under it */}
      <path d="M0 120 A260 260 0 0 1 260 380 L0 380 Z" fill="#DCE8FE" />
      <rect x="0" y="380" width="150" height="150" fill="#F1E7D6" />
      <circle cx="225" cy="455" r="18" fill="#B9CFF9" />
      {/* right: a violet quarter circle and a teal ring */}
      <path d="M1440 80 A240 240 0 0 0 1200 320 L1440 320 Z" fill="#E9E3FD" />
      <rect x="1290" y="320" width="150" height="150" fill="#DDF1EC" />
      <circle cx="1210" cy="430" r="44" fill="none" stroke="#C9B9F7" strokeWidth="10" />
    </svg>
  );
}
