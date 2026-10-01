import { ImageResponse } from "next/og";
import { brandMarkDataUri } from "@/lib/brand-mark";

/* Apple touch icon. iOS does not accept SVG here, so the mark is rendered to
   PNG. Inline styles are required by `next/og`; it does not read CSS classes. */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const mark = await brandMarkDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={mark} width={112} height={109} />
      </div>
    ),
    size,
  );
}
