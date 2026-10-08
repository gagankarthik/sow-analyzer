import { notFound } from "next/navigation";
import { ShowcaseScreen } from "../_components/ShowcaseScreen";
import { isShowcaseScreen } from "../_components/screens";

/** /showcase/board, /contract, /matrix, /reports, /bottlenecks (development only). */
export default async function ShowcasePage({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen } = await params;
  if (!isShowcaseScreen(screen)) notFound();
  return <ShowcaseScreen screen={screen} />;
}
