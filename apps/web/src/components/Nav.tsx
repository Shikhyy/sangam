"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const LINKS = [
  { id: "how", label: "How it works" },
  { id: "developers", label: "Developers" },
  { id: "results", label: "Results" },
];

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * A floating glass bar. It tightens once the page scrolls, marks the section you are reading, and
 * folds into a menu on a phone.
 */
export function Nav({ current = "home" }: { current?: "home" | "playground" }) {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (current !== "home") return;
    const sections = LINKS.map((link) => document.getElementById(link.id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [current]);

  const href = (id: string) => (current === "home" ? `#${id}` : `/#${id}`);

  return (
    <header className={stuck ? "nv is-stuck" : "nv"}>
      <div className="nv-in">
        <Link href="/" className="nv-logo">
          <Logo />
        </Link>

        <nav className="nv-links" aria-label="Main">
          {LINKS.map((link) => (
            <a key={link.id} href={href(link.id)} className={active === link.id ? "on" : undefined}>
              {link.label}
            </a>
          ))}
          <Link href="/playground" className={current === "playground" ? "on" : undefined}>
            Playground
          </Link>
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
          {LINKS.map((link) => (
            <a key={link.id} href={href(link.id)} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link href="/playground" onClick={() => setOpen(false)}>
            Playground
          </Link>
        </div>
      ) : null}
    </header>
  );
}
