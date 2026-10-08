/* Shapes behind the navy footer: the same flat geometry as the hero (quarter
   circles, squares, a ring), drawn in navy tints a few steps
   lighter than the footer so they read as texture, never as decoration that
   competes with the links. */
export function FooterBackdrop() {
  return (
    <svg
      className="lp-footer-backdrop"
      viewBox="0 0 1440 640"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* top right: a quarter circle with a square beneath */}
      <path d="M1440 0 L1440 260 A260 260 0 0 1 1180 0 Z" fill="#13203A" />
      <rect x="1300" y="260" width="140" height="140" fill="#101B31" />
      <circle cx="1235" cy="330" r="34" fill="none" stroke="#1F3A6E" strokeWidth="8" />
      <circle cx="1150" cy="70" r="10" fill="#2A5BD7" />
      {/* bottom left: a quarter circle hugging the corner, clear of the text */}
      <path d="M0 640 L0 500 A140 140 0 0 1 140 640 Z" fill="#13203A" />
    </svg>
  );
}
