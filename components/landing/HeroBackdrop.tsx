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

/* The hero's lower edge: shapes either side of the product card, so the
   hero visibly runs down to where the card ends. */
export function HeroBackdropLow() {
  return (
    <svg
      className="lp-hero3-backdrop-low"
      viewBox="0 0 1440 420"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* left: a violet quarter circle on the floor and a blue dot */}
      <path d="M0 420 V200 A220 220 0 0 1 220 420 Z" fill="#E9E3FD" />
      <circle cx="250" cy="150" r="16" fill="#B9CFF9" />
      {/* right: a blue square on the floor, a sand quarter circle above it */}
      <rect x="1290" y="270" width="150" height="150" fill="#DCE8FE" />
      <path d="M1440 270 H1260 A180 180 0 0 1 1440 90 Z" fill="#F1E7D6" />
    </svg>
  );
}
