"use client";
// Community / mutual aid. Large Leaflet map (centerpiece) with clustering, a
// synced side-panel list, filters, trust-scored profile cards with a
// "Why was I matched?" transparency panel, the Time Credits ledger, an
// availability calendar with .ics export, and a Jitsi launch for exchanges.
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Button, Badge, Tabs, EmptyState } from "@/components/ui";
import { OFFER_LABELS, OFFER_TYPES } from "@/lib/constants";
import { useDirectory, useTimeCredits } from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { offerTimeExchange, updateExchangeStatus } from "@/lib/actions";
import { fmtDate } from "@/lib/utils";
import type { MutualAidDirectoryRow } from "@/lib/types";

const CommunityMap = dynamic(() => import("@/components/dashboard/CommunityMap"), {
  ssr: false,
  loading: () => <div className="h-[28rem] w-full animate-pulse rounded-xl bg-slate-100" />,
});

export default function CommunityPage() {
  const [tab, setTab] = useState("map");
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Mutual aid & timebank</h1>
      </div>
      <Tabs
        tabs={[
          { id: "map", label: "Neighbour map" },
          { id: "ledger", label: "Time credits" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "map" ? <MapView /> : <LedgerView />}
    </div>
  );
}

function MapView() {
  const { data: rows } = useDirectory();
  const userId = useApp((s) => s.userId);
  const [selected, setSelected] = useState<string | null>(null);
  const [offerFilter, setOfferFilter] = useState<string>("");
  const [minTrust, setMinTrust] = useState(0);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (offerFilter && !r.offers_help_with.includes(offerFilter)) return false;
      if (r.composite_trust_score < minTrust) return false;
      return true;
    });
  }, [rows, offerFilter, minTrust]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CommunityMap rows={filtered} focusUserId={selected} onSelect={setSelected} />
      </div>
      <aside className="space-y-3">
        <Card>
          <CardBody className="pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Filters
            </p>
            <label className="mb-1 block text-xs text-slate-500">Offer type</label>
            <select
              value={offerFilter}
              onChange={(e) => setOfferFilter(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {OFFER_TYPES.map((o) => (
                <option key={o} value={o}>
                  {OFFER_LABELS[o]}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-xs text-slate-500">
              Minimum trust: {Math.round(minTrust * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minTrust * 100}
              onChange={(e) => setMinTrust(Number(e.target.value) / 100)}
              className="w-full accent-brand-700"
              aria-label="Minimum trust score"
            />
          </CardBody>
        </Card>

        <div className="max-h-[24rem] space-y-2 overflow-y-auto">
          {filtered.length ? (
            filtered.map((r) => (
              <ProfileCard
                key={r.user_id}
                row={r}
                selected={selected === r.user_id}
                onSelect={() => setSelected(r.user_id)}
                fromUserId={userId}
              />
            ))
          ) : (
            <EmptyState title="No neighbours match" hint="Try widening your filters." />
          )}
        </div>
      </aside>
    </div>
  );
}

function ProfileCard({
  row,
  selected,
  onSelect,
  fromUserId,
}: {
  row: MutualAidDirectoryRow;
  selected: boolean;
  onSelect: () => void;
  fromUserId: string | null;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [offered, setOffered] = useState(false);
  const trustPct = Math.round(row.composite_trust_score * 100);

  const jitsiRoom = `arogyasetu-${row.user_id}`.replace(/[^a-zA-Z0-9-]/g, "");

  const offer = async () => {
    await offerTimeExchange(fromUserId, row.user_id, 1, "Support exchange");
    setOffered(true);
  };

  return (
    <Card className={selected ? "ring-2 ring-brand-400" : ""}>
      <CardBody className="pt-4">
        <button onClick={onSelect} className="flex w-full items-start justify-between text-left">
          <div>
            <p className="font-semibold text-slate-800">{row.display_name ?? "Neighbour"}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {row.offers_help_with.map((o) => (
                <Badge key={o}>{OFFER_LABELS[o] ?? o}</Badge>
              ))}
            </div>
          </div>
          <Badge color={trustPct >= 75 ? "green" : trustPct >= 50 ? "amber" : "slate"}>
            {trustPct}% trust
          </Badge>
        </button>

        {row.bio && <p className="mt-2 text-xs text-slate-500">{row.bio}</p>}

        <div className="mt-2 flex flex-wrap gap-1">
          {row.public_badges.map((b) => (
            <Badge key={b} color="brand">
              {b}
            </Badge>
          ))}
          {row.verification_status === "orientation_completed" && (
            <Badge color="green">Verified</Badge>
          )}
        </div>

        <button
          onClick={() => setShowWhy((v) => !v)}
          className="mt-2 text-xs text-brand-600 underline"
          aria-expanded={showWhy}
        >
          Why was I matched?
        </button>
        {showWhy && (
          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 animate-fade-in">
            Trust is a transparent weighted blend: <strong>35%</strong> proximity,{" "}
            <strong>25%</strong> shared condition tags, <strong>20%</strong> historical reliability,{" "}
            <strong>20%</strong> response latency. Only the final composite is shown to others; the
            sub-components of someone else&apos;s score are never exposed.
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button className="px-3 py-1 text-xs" onClick={offer} disabled={offered}>
            {offered ? "Offer sent ✓" : "Offer help"}
          </Button>
          <a
            href={`https://meet.jit.si/${jitsiRoom}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="px-3 py-1 text-xs">
              <i className="bi bi-camera-video" aria-hidden /> Video
            </Button>
          </a>
          <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => exportIcs(row)}>
            .ics
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function LedgerView() {
  const { data: credits } = useTimeCredits();
  const userId = useApp((s) => s.userId) ?? "demo";
  const qc = useQueryClient();

  const balance = (credits ?? []).reduce((sum, c) => {
    if (c.status !== "completed") return sum;
    if (c.to_user_id === userId) return sum + c.hours;
    if (c.from_user_id === userId) return sum - c.hours;
    return sum;
  }, 0);

  const act = async (id: string, status: "accepted" | "completed" | "declined", rating?: number) => {
    await updateExchangeStatus(id, status, rating);
    qc.invalidateQueries({ queryKey: ["time-credits"] });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardBody className="pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Balance</p>
          <p className="mt-2 text-4xl font-bold text-brand-700">{balance.toFixed(1)}h</p>
          <p className="mt-1 text-xs text-slate-400">
            Time given and received are equal in value — that&apos;s the point of timebanking.
          </p>
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Transaction history
          </p>
          {(credits ?? []).length ? (
            <ul className="space-y-2">
              {(credits ?? []).map((c) => {
                const incoming = c.to_user_id === userId;
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {incoming ? "Received" : "Given"} · {c.hours}h
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.exchange_description || "Support exchange"} · {fmtDate(c.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        color={
                          c.status === "completed"
                            ? "green"
                            : c.status === "declined"
                              ? "slate"
                              : "amber"
                        }
                      >
                        {c.status}
                      </Badge>
                      {c.status === "offered" && (
                        <>
                          <Button className="px-2 py-1 text-xs" onClick={() => act(c.id, "accepted")}>
                            Accept
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            onClick={() => act(c.id, "declined")}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {c.status === "accepted" && (
                        <Button
                          className="px-2 py-1 text-xs"
                          onClick={() => act(c.id, "completed", 5)}
                        >
                          Complete & rate ★
                        </Button>
                      )}
                      {c.status === "completed" && c.rating && (
                        <span className="text-xs text-amber-500">
                          {"★".repeat(c.rating)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No exchanges yet" hint="Offer or request help from the map to begin." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// Build a minimal RFC-5545 .ics availability file for a neighbour.
function exportIcs(row: MutualAidDirectoryRow) {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = new Date();
  start.setHours(start.getHours() + 24, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AROGYASETU//Mutual Aid//EN",
    "BEGIN:VEVENT",
    `UID:${row.user_id}-${Date.now()}@arogyasetu`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:Support exchange with ${row.display_name ?? "neighbour"}`,
    "DESCRIPTION:Mutual-aid time exchange via AROGYASETU",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `availability-${row.user_id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
