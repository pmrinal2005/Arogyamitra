"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/settings/profile", label: "Profile" },
  { href: "/dashboard/settings/privacy", label: "Privacy & consent" },
  { href: "/dashboard/settings/family", label: "Care circle" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
      <nav className="flex gap-1 rounded-xl bg-slate-100 p-1" aria-label="Settings sections">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition",
              pathname === t.href
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
