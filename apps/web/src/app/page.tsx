import { redirect } from "next/navigation";

// The landing page is designed but not built yet. Until then, open the playground.
export default function Home() {
  redirect("/playground");
}
