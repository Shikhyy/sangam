import type { Metadata } from "next";
import { Playground } from "../../components/Playground";
import "../landing.css";

export const metadata: Metadata = { title: "Playground · Sangam" };

export default function PlaygroundPage() {
  return <Playground />;
}
