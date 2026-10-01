import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The logo mark as a data URI, for images generated with `next/og`. */
export async function brandMarkDataUri(): Promise<string> {
  const svg = await readFile(join(process.cwd(), "public/logo-icon.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}
