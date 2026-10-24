import type { Metadata } from "next";
import { SignerPage } from "@/components/esign/SignerPage";

// A signer's page for one Govern e-signature request. Public (no sign-in, no
// app shell, no cookies): the token in the path is the credential, checked by
// the API. Never indexed, and the token never leaves in a Referer header.
export const metadata: Metadata = {
  title: "Sign a document",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
  openGraph: null,
  twitter: null,
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SignerPage token={token} />;
}
