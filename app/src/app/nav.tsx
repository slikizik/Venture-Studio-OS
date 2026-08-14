"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Portfolio" },
  { href: "/projects", label: "Projects" },
  { href: "/agents", label: "Agents" },
  { href: "/decisions", label: "Decisions" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav" data-testid="nav">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href)) ? "active" : ""}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
