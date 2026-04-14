"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Newspaper } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Summarize", icon: BookOpen },
  { href: "/news", label: "AI News", icon: Newspaper },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/10 bg-black/65 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 px-3 py-2.5 sm:justify-start sm:px-4 sm:py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                active
                  ? "bg-lime-300/20 text-lime-200 ring-1 ring-lime-300/35"
                  : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
