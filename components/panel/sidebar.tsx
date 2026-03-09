"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-panel md:flex md:flex-col">
      <div className="border-b border-border px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Marketing AI OS
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">Painel Admin</h1>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-panel-strong text-white"
                  : "text-slate-300 hover:bg-panel-strong/70 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
