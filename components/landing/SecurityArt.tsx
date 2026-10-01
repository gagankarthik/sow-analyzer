/* ──────────────────────────────────────────────────────────────
   Security illustrations — one drawing per control, each showing
   the mechanism rather than a generic lock or shield icon.
   Shared viewBox so they sit on one baseline.
   ────────────────────────────────────────────────────────────── */

const BOX = "0 0 96 72";

/* Encryption: a document goes in readable and travels as cipher. */
export function EncryptionArt() {
  return (
    <svg viewBox={BOX} className="lp-ill" aria-hidden="true">
      <rect className="lp-ill-paper" x="6" y="14" width="30" height="40" rx="3" />
      <path className="lp-ill-line" d="M13 25h16M13 32h16M13 39h10" />
      <path className="lp-ill-muted" d="M40 34h14" />
      <rect className="lp-ill-soft" x="58" y="30" width="32" height="26" rx="4" />
      <path className="lp-ill-line" d="M65 30v-6a9 9 0 0 1 18 0v6" />
      <circle className="lp-ill-solid" cx="74" cy="41" r="3.5" />
      <path className="lp-ill-accent" d="M74 44v5" />
    </svg>
  );
}

/* Tenant isolation: three walled cells, yours highlighted, no doors between. */
export function IsolationArt() {
  return (
    <svg viewBox={BOX} className="lp-ill" aria-hidden="true">
      <rect className="lp-ill-paper" x="6" y="18" width="24" height="38" rx="3" />
      <rect className="lp-ill-soft" x="36" y="12" width="24" height="44" rx="3" />
      <rect className="lp-ill-paper" x="66" y="18" width="24" height="38" rx="3" />
      <path className="lp-ill-muted" d="M12 30h12M12 38h12M72 30h12M72 38h12" />
      <path className="lp-ill-line" d="M42 24h12M42 31h12M42 38h8" />
      <circle className="lp-ill-solid" cx="48" cy="48" r="3" />
      <path className="lp-ill-stop" d="M31 34l4 4m0-4l-4 4M61 34l4 4m0-4l-4 4" />
    </svg>
  );
}

/* AI processing: the clause goes to the model and an answer comes back;
   the path into training is cut. */
export function ProcessingArt() {
  return (
    <svg viewBox={BOX} className="lp-ill" aria-hidden="true">
      <rect className="lp-ill-paper" x="6" y="22" width="24" height="30" rx="3" />
      <path className="lp-ill-line" d="M12 31h12M12 38h8" />
      <path className="lp-ill-accent" d="M33 33h13m-4-4l4 4-4 4" />
      <circle className="lp-ill-soft" cx="62" cy="37" r="13" />
      <circle className="lp-ill-solid" cx="62" cy="37" r="4" />
      <path className="lp-ill-accent" d="M46 43H33m4 4l-4-4 4-4" />
      <path className="lp-ill-muted" d="M62 22V10h22" />
      <path className="lp-ill-stop" d="M70 6l8 8m0-8l-8 8" />
    </svg>
  );
}

/* Deletion: the document and everything derived from it are removed together. */
export function DeletionArt() {
  return (
    <svg viewBox={BOX} className="lp-ill" aria-hidden="true">
      <rect className="lp-ill-paper" x="10" y="12" width="30" height="40" rx="3" />
      <path className="lp-ill-muted" d="M17 23h16M17 30h16M17 37h10" />
      <path className="lp-ill-accent" d="M44 32h12m-4-4l4 4-4 4" />
      <path className="lp-ill-soft" d="M64 26h22l-2 32a3 3 0 0 1-3 3H69a3 3 0 0 1-3-3z" />
      <path className="lp-ill-line" d="M60 26h30M70 26v-5h10v5" />
      <path className="lp-ill-accent" d="M72 35v17M78 35v17" />
    </svg>
  );
}

/* Compliance: a report with its checks passed and a seal on it. */
export function ComplianceArt() {
  return (
    <svg viewBox={BOX} className="lp-ill" aria-hidden="true">
      <rect className="lp-ill-paper" x="14" y="8" width="44" height="56" rx="3" />
      <path className="lp-ill-accent" d="M22 22l3 3 5-6M22 35l3 3 5-6M22 48l3 3 5-6" />
      <path className="lp-ill-line" d="M36 23h14M36 36h14M36 49h9" />
      <path className="lp-ill-soft" d="M70 30l14 5v11c0 9-6 14-14 17-8-3-14-8-14-17V35z" />
      <path className="lp-ill-accent" d="M64 46l4 4 8-9" />
    </svg>
  );
}
