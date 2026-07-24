"use client";
// Public / community resource directory + always-available crisis resources.
// Crisis lines are shown prominently and never hidden. Community resources come
// from the `community_resources` table (public SELECT for approved rows); a
// static fallback keeps the page useful if the backend is unavailable.
import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, Badge, Input, EmptyState } from "@/components/ui";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { CRISIS_LINES, getCrisisLines, SAFETY_DISCLAIMER, detectCountry } from "@/lib/crisis-resources";

interface CommunityResource {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  phone: string | null;
  url: string | null;
  is_crisis_resource: boolean;
  country_code: string | null;
}

const FALLBACK_RESOURCES: CommunityResource[] = [
  {
    id: "r1",
    name: "Local community wellbeing centre",
    category: "wellbeing",
    description: "Drop-in peer support, warmlines, and group activities.",
    phone: null,
    url: null,
    is_crisis_resource: false,
    country_code: null,
  },
  {
    id: "r2",
    name: "Free telehealth counselling directory",
    category: "counselling",
    description: "Sliding-scale and free counselling options near you.",
    phone: null,
    url: "https://findahelpline.com",
    is_crisis_resource: false,
    country_code: null,
  },
];

export default function ResourcesPage() {
  const [country, setCountry] = useState("DEFAULT");
  const [resources, setResources] = useState<CommunityResource[]>(FALLBACK_RESOURCES);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setCountry(detectCountry());
    if (!isSupabaseConfigured()) return;
    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const { data } = await sb
          .from("community_resources")
          .select("*")
          .eq("approved", true)
          .limit(200);
        if (data && data.length) setResources(data as unknown as CommunityResource[]);
      } catch {
        /* keep fallback */
      }
    })();
  }, []);

  const crisisLines = useMemo(() => getCrisisLines(country), [country]);
  const filtered = useMemo(() => {
    if (!search.trim()) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q),
    );
  }, [resources, search]);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Resources</h1>

      {/* Crisis resources — always prominent */}
      <Card className="border-brand-300 bg-brand-50/60">
        <CardBody className="pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-900">
              <i className="bi bi-life-preserver mr-1" aria-hidden /> Crisis support (always
              available)
            </p>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              aria-label="Country for crisis resources"
            >
              {Object.keys(CRISIS_LINES).map((c) => (
                <option key={c} value={c}>
                  {c === "DEFAULT" ? "International" : c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {crisisLines.map((l) => (
              <div key={l.name} className="rounded-xl border border-brand-200 bg-white p-3">
                <p className="font-semibold text-slate-900">{l.name}</p>
                <p className="font-medium text-brand-700">{l.contact}</p>
                {l.note && <p className="text-xs text-slate-500">{l.note}</p>}
                {l.url && (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 underline"
                  >
                    {l.url}
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{SAFETY_DISCLAIMER}</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Community directory
          </p>
          <Input
            className="mb-3"
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filtered.length ? (
            <ul className="space-y-3">
              {filtered.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    {r.category && <Badge>{r.category}</Badge>}
                  </div>
                  {r.description && (
                    <p className="mt-1 text-sm text-slate-500">{r.description}</p>
                  )}
                  <div className="mt-1 flex gap-3 text-xs text-brand-600">
                    {r.phone && <span>{r.phone}</span>}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">
                        Visit
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No resources found" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
