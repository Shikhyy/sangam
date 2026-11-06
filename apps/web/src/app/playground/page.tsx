import type { Metadata } from "next";
import { Footer } from "../../components/Footer";
import { Playground } from "../../components/Playground";
import "../landing.css";

export const metadata: Metadata = { title: "Playground · Sangam" };

export default function PlaygroundPage() {
  return (
    <>
      <Playground />
      <Footer />
    </>
  );
}
