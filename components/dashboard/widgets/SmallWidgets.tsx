"use client";
import Link from "next/link";
import { Card, CardBody, Badge, Button } from "@/components/ui";
import {
  useJournal,
  useTimeCredits,
  useCarePings,
  useResilience,
  useBadges,
  useLatestIntervention,
} from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { fmtDate } from "@/lib/utils";

export function JournalStreakWidget() {
  const { data: entries } = useJournal();
  const latest = (entries ?? [])[0];
  return (
    <Card>
      <CardBody className="pt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Journal
          </p>
          <Link href="/dashboard/journal">
            <Button variant="ghost" className="px-2 py-1 text-xs">
              New entry
            </Button>
          </Link>
        </div>
        {latest ? (
          <>
            <p className="line-clamp-2 text-sm text-slate-600">{latest.content}</p>
            <p className="mt-2 text-xs text-slate-400">{fmtDate(latest.created_at)}</p>
          </>
        ) : (
          <p className="text-sm text-slate-400">No entries yet — start when ready.</p>
        )}
      </CardBody>
    </Card>
  );
}

export function TimeCreditsWidget() {
  const userId = useApp((s) => s.userId) ?? "demo";
  const { data: credits } = useTimeCredits();
  const balance = (credits ?? []).reduce((sum, c) => {
    if (c.status !== "completed") return sum;
    if (c.to_user_id === userId) return sum + c.hours;
    if (c.from_user_id === userId) return sum - c.hours;
    return sum;
  }, 0);
  return (
    <Card>
      <CardBody className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Time Credits
        </p>
        <p className="mt-2 text-3xl font-bold text-brand-700">{balance.toFixed(1)}h</p>
        <p className="mt-1 text-xs text-slate-400">
          {(credits ?? []).length} exchanges on record
        </p>
      </CardBody>
    </Card>
  );
}

export function CarePingFeedWidget() {
  const { data: pings } = useCarePings();
  const recent = (pings ?? []).slice(0, 3);
  return (
    <Card>
      <CardBody className="pt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Care Ping Activity
          </p>
          <Link href="/dashboard/care-pings" className="text-xs text-brand-600 underline">
            View all
          </Link>
        </div>
        {recent.length ? (
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{fmtDate(p.created_at)}</span>
                <Badge
                  color={
                    p.status === "accepted"
                      ? "green"
                      : p.status === "declined" || p.status === "expired"
                        ? "slate"
                        : "amber"
                  }
                >
                  {p.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No care ping activity yet.</p>
        )}
      </CardBody>
    </Card>
  );
}

export function ResilienceWidget() {
  const { data: res } = useResilience();
  const { data: badges } = useBadges();
  return (
    <Card>
      <CardBody className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Resilience Points
        </p>
        <p className="mt-2 text-3xl font-bold text-brand-700">{res?.points ?? 0}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(badges ?? []).map((b) => (
            <Badge key={b.badge_type} color="brand">
              {b.badge_type}
            </Badge>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function InterventionWidget() {
  const { data: bhiIsElevated } = useLatestIntervention();
  const iv = bhiIsElevated;
  if (!iv) return null;
  return (
    <Card className="border-brand-200 bg-brand-50/50">
      <CardBody className="pt-5">
        <div className="mb-1 flex items-center gap-2">
          <i className="bi bi-stars text-brand-600" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            A gentle suggestion for you
          </p>
        </div>
        <p className="text-sm text-slate-700">{iv.generated_text}</p>
        <p className="mt-2 text-[10px] text-slate-400">
          Supportive reflection, not clinical advice
          {iv.source === "template_fallback" ? " · offline template" : ""}.
        </p>
      </CardBody>
    </Card>
  );
}
