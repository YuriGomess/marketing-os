"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 z-30 h-16 border-b border-border bg-panel/90 backdrop-blur md:left-72 md:right-0">
      <div className="flex h-full items-center justify-between px-4 md:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Workspace</p>
          <p className="text-sm font-medium text-slate-100">Marketing AI OS</p>
        </div>

        <div className="hidden items-center gap-3 rounded-xl border border-border bg-panel-strong px-4 py-2 text-sm text-slate-300 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Ambiente ativo
        </div>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                isActive
                  ? "bg-panel-strong text-white"
                  : "bg-panel text-slate-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
