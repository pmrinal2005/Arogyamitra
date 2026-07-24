"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/use-i18n";
import { useApp } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", key: "nav.overview", icon: "bi-grid-1x2" },
  { href: "/dashboard/checkin", key: "nav.checkin", icon: "bi-clipboard-heart" },
  { href: "/dashboard/journal", key: "nav.journal", icon: "bi-journal-text" },
  { href: "/dashboard/scales", key: "nav.scales", icon: "bi-clipboard-data" },
  { href: "/dashboard/environment", key: "nav.environment", icon: "bi-cloud-haze2" },
  { href: "/dashboard/community", key: "nav.community", icon: "bi-people" },
  { href: "/dashboard/care-pings", key: "nav.carePings", icon: "bi-bell" },
  { href: "/dashboard/insights", key: "nav.insights", icon: "bi-graph-up" },
  { href: "/dashboard/resources", key: "nav.resources", icon: "bi-life-preserver" },
  { href: "/dashboard/settings/profile", key: "nav.settings", icon: "bi-gear" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const demoMode = useApp((s) => s.demoMode);

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      try {
        await getSupabaseBrowser().auth.signOut();
      } catch {
        /* ignore */
      }
    }
    window.location.href = "/login";
  };

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="block">
          <span className="text-lg font-bold text-brand-800">AROGYASETU</span>
        </Link>
        {demoMode && (
          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            DEMO MODE
          </span>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Primary">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href.replace("/profile", ""));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <i className={cn("bi", item.icon, "text-base")} aria-hidden />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <i className="bi bi-box-arrow-right" aria-hidden /> {t("nav.signout")}
        </button>
      </div>
    </aside>
  );
}
