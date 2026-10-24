import { redirect } from "next/navigation";

// The Dashboard moved to /dashboard. Old links and bookmarks land there.
export default function HomeRedirect() {
  redirect("/dashboard");
}
