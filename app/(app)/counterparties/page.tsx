import { redirect } from "next/navigation";

// Counterparties is no longer a page of its own: each agreement names its
// counterparty, and Contracts lists and searches them. Old links land there.
export default function CounterpartiesPage() {
  redirect("/contracts?view=all");
}
