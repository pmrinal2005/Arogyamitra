"use client";
// Care Pings inbox. Two tabs: pings received (as a matched neighbour) and pings
// involving me as the at-risk user (privacy-respecting — I see WHO was notified
// on my behalf, not their private data). Realtime updates arrive via the global
// CarePingRealtime subscription which invalidates the query. Post-interaction a
// 1-click outcome rating + note feeds trust-score recomputation.
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Button, Badge, Tabs, EmptyState } from "@/components/ui";
import { useCarePings } from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { respondToPing } from "@/lib/actions";
import { fmtDate } from "@/lib/utils";
import type { CarePing } from "@/lib/types";

export default function CarePingsPage() {
  const userId = useApp((s) => s.userId) ?? "demo";
  const { data: pings } = useCarePings();
  const [tab, setTab] = useState("received");

  const received = useMemo(
    () => (pings ?? []).filter((p) => p.matched_user_id === userId),
    [pings, userId],
  );
  const involved = useMemo(
    () => (pings ?? []).filter((p) => p.at_risk_user_id === userId),
    [pings, userId],
  );

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Care pings</h1>
      <Tabs
        tabs={[
          { id: "received", label: `Received (${received.length})` },
          { id: "involved", label: `On my behalf (${involved.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "received" ? (
        received.length ? (
          <ul className="space-y-3">
            {received.map((p) => (
              <ReceivedPing key={p.id} ping={p} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No incoming pings" hint="When a neighbour may need support, you'll see it here (and get a desktop notification)." />
        )
      ) : involved.length ? (
        <ul className="space-y-3">
          {involved.map((p) => (
            <Card key={p.id}>
              <CardBody className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      A trusted neighbour was notified on your behalf
                    </p>
                    <p className="text-xs text-slate-500">{fmtDate(p.created_at)}</p>
                  </div>
                  <Badge color={p.status === "accepted" ? "green" : "amber"}>{p.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  We only share the minimum needed to help — never your journal, scores, or private
                  notes.
                </p>
              </CardBody>
            </Card>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing here" hint="If your index becomes elevated and you've enabled Care Pings, we'll discreetly notify a trusted match." />
      )}
    </div>
  );
}

function ReceivedPing({ ping }: { ping: CarePing }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState<number | null>(ping.outcome_rating);
  const [note, setNote] = useState(ping.outcome_notes ?? "");
  const jitsiRoom = `arogyasetu-ping-${ping.id}`.replace(/[^a-zA-Z0-9-]/g, "");

  const act = async (status: "accepted" | "declined") => {
    await respondToPing(ping.id, status);
    qc.invalidateQueries({ queryKey: ["care-pings"] });
  };
  const saveOutcome = async (r: number) => {
    setRating(r);
    await respondToPing(ping.id, "accepted", note, r);
    qc.invalidateQueries({ queryKey: ["care-pings"] });
    qc.invalidateQueries({ queryKey: ["trust-scores"] });
  };

  const done = ping.status === "accepted" || ping.status === "declined";

  return (
    <li>
      <Card className="animate-ping-in">
        <CardBody className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                A neighbour may need a little support
              </p>
              <p className="text-xs text-slate-500">{fmtDate(ping.created_at)}</p>
            </div>
            <Badge
              color={
                ping.status === "accepted"
                  ? "green"
                  : ping.status === "declined" || ping.status === "expired"
                    ? "slate"
                    : "amber"
              }
            >
              {ping.status}
            </Badge>
          </div>

          {!done && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="px-3 py-1 text-xs" onClick={() => act("accepted")}>
                Accept &amp; schedule
              </Button>
              <a href={`https://meet.jit.si/${jitsiRoom}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="px-3 py-1 text-xs">
                  <i className="bi bi-camera-video" aria-hidden /> Start video now
                </Button>
              </a>
              <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => act("declined")}>
                Can&apos;t right now
              </Button>
            </div>
          )}

          {ping.status === "accepted" && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500">How did it go?</p>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => saveOutcome(r)}
                    aria-label={`Rate ${r} of 5`}
                    className={`text-lg ${
                      (rating ?? 0) >= r ? "text-amber-400" : "text-slate-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => rating && saveOutcome(rating)}
                placeholder="Optional note (private)…"
                rows={2}
                className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}
        </CardBody>
      </Card>
    </li>
  );
}
