import { redirect } from "next/navigation";

// The Dashboard is now Home's "Risk and documents" view. Old links land there.
export default function DashboardPage() {
  redirect("/home?view=risk");
}
