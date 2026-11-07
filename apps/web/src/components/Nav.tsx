"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

export type Page = "home" | "playground" | "docs" | "results" | "card";

const PAGES: { page: Page; href: string; label: string }[] = [
  { page: "docs", href: "/docs", label: "Docs" },
  { page: "playground", href: "/playground", label: "Playground" },
  { page: "results", href: "/results", label: "Results" },
];

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * A floating glass bar. It tightens once the page scrolls, marks where you are, and folds into a
 * menu on a phone.
 */
export function Nav({ current = "home" }: { current?: Page }) {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On the home page, light up "How it works" while that section is on screen.
  useEffect(() => {
    if (current !== "home") return;
    const section = document.getElementById("how");
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setReading(entry?.isIntersecting ?? false), {
      rootMargin: "-40% 0px -55% 0px",
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [current]);

  const howHref = current === "home" ? "#how" : "/#how";

  return (
    <header className={stuck ? "nv is-stuck" : "nv"}>
      <div className="nv-in">
        <Link href="/" className="nv-logo">
          <Logo />
        </Link>

        <nav className="nv-links" aria-label="Main">
          <a href={howHref} className={reading ? "on" : undefined}>
            How it works
          </a>
          {PAGES.map((item) => (
            <Link
              key={item.page}
              href={item.href}
              className={current === item.page ? "on" : undefined}
              aria-current={current === item.page ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nv-right">
          <a href="https://github.com/Shikhyy/sangam" className="nv-gh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={stroke}>
              <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
            </svg>
            <span className="sr-only">Source code on GitHub</span>
          </a>
          <Link href="/playground" className="btn btn-primary btn-sm">
            Try it
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <button
            type="button"
            className="nv-burger"
            aria-expanded={open}
            aria-controls="nv-sheet"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={stroke}>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div id="nv-sheet" className="nv-sheet">
          <a href={howHref} onClick={() => setOpen(false)}>
            How it works
          </a>
          {PAGES.map((item) => (
            <Link key={item.page} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
