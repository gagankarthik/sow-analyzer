import { ImageResponse } from "next/og";
import { brandMarkDataUri } from "@/lib/brand-mark";

/* Share image for every public page. Inline styles are required by `next/og`;
   it does not read CSS classes. */

export const alt = "Blue-IQ Govern: contract review against your matrix";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#2456E6";

export default async function OpengraphImage() {
  const mark = await brandMarkDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BRAND,
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 88,
              height: 88,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              background: "#FFFFFF",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={mark} width={54} height={53} />
          </div>
          <div style={{ marginLeft: 24, fontSize: 56, fontWeight: 700, letterSpacing: -1.5 }}>Blue-IQ</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2.5, maxWidth: 940 }}>
            Catch the risky clause before it is signed.
          </div>
          <div style={{ marginTop: 28, fontSize: 32, lineHeight: 1.3, color: "#D3DFFF", maxWidth: 1040 }}>
            Every agreement checked against your matrix, from first read to signature.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
