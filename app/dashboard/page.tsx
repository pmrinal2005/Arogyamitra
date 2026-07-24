"use client";
// Home overview — the primary screen. A multi-panel desktop grid where each
// widget loads/errors independently, so one failed data source never breaks the
// whole page. Crisis resources live persistently in the layout footer.
import RiskCard from "@/components/dashboard/widgets/RiskCard";
import ForecastStrip from "@/components/dashboard/widgets/ForecastStrip";
import EnvSnapshotCard from "@/components/dashboard/widgets/EnvSnapshotCard";
import QuickCheckin from "@/components/dashboard/widgets/QuickCheckin";
import {
  JournalStreakWidget,
  TimeCreditsWidget,
  CarePingFeedWidget,
  ResilienceWidget,
  InterventionWidget,
} from "@/components/dashboard/widgets/SmallWidgets";
import { useEnv } from "@/lib/use-env";
import { usePersonalEnvNote } from "@/lib/hooks";
import { useI18n } from "@/lib/use-i18n";

export default function OverviewPage() {
  const { t } = useI18n();
  const { data: env } = useEnv();
  const note = usePersonalEnvNote(env);

  return (
    <div className="animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">{t("overview.title")}</h1>

      {/* Elevated-risk gentle suggestion, only shows when one exists */}
      <InterventionWidget />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left/main column */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RiskCard />
            <EnvSnapshotCard note={note ?? undefined} />
          </div>
          <ForecastStrip />
          <QuickCheckin />
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <ResilienceWidget />
          <JournalStreakWidget />
          <TimeCreditsWidget />
          <CarePingFeedWidget />
        </aside>
      </div>
    </div>
  );
}
