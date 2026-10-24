// The typed-signature face. Loaded only by the signer page (/sign/[token]),
// so the rest of the app never downloads it. Self-hosted by next/font.
import { Dancing_Script } from "next/font/google";

export const signatureScript = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["cursive"],
});
