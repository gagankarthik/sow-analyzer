import { Badge } from "@/components/ui/badge";
import { docTypeShort, docTypeTone } from "@/lib/doc-types";

/** A document-type chip with a friendly short label and a consistent tone
 *  (e.g. DPA / BAA / Compliance in green, License in the AI accent). */
export function DocTypeBadge({
  type,
  size = "sm",
}: {
  type: string | null | undefined;
  size?: "sm" | "md";
}) {
  return (
    <Badge variant={docTypeTone(type)} size={size}>
      {docTypeShort(type)}
    </Badge>
  );
}
