"use client";
// Care circle — permissioned caregiver/circle view management. A user can invite
// trusted people (by email) and choose exactly what they may see. Privacy-by-
// default: every share scope starts OFF. Backed by `care_circle` (created lazily
// if present); degrades to local-only state in demo mode.
import { useState } from "react";
import { Card, CardBody, Button, Input, Toggle, Badge, EmptyState } from "@/components/ui";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";

interface CircleMember {
  email: string;
  scopes: Record<string, boolean>;
}

const SCOPES: { key: string; label: string }[] = [
  { key: "risk_bucket", label: "My current risk bucket (Low/Moderate/Elevated)" },
  { key: "care_pings", label: "Be notified as a Care Ping contact" },
  { key: "checkin_streak", label: "My check-in streak (not the scores)" },
];

export default function FamilyPage() {
  const userId = useApp((s) => s.userId);
  const configured = isSupabaseConfigured();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const invite = async () => {
    if (!email.trim()) return;
    const member: CircleMember = {
      email: email.trim(),
      scopes: Object.fromEntries(SCOPES.map((s) => [s.key, false])),
    };
    setMembers((m) => [...m, member]);
    setEmail("");
    if (configured && userId) {
      try {
        await getSupabaseBrowser().from("care_circle").insert({
          owner_id: userId,
          member_email: member.email,
          scopes: member.scopes,
          status: "invited",
        });
        setStatus(`Invitation noted for ${member.email}.`);
      } catch {
        setStatus("Saved locally (care circle table not yet provisioned).");
      }
    } else {
      setStatus(`Demo: invited ${member.email} (not persisted).`);
    }
  };

  const setScope = async (idx: number, key: string, value: boolean) => {
    setMembers((m) =>
      m.map((mem, i) => (i === idx ? { ...mem, scopes: { ...mem.scopes, [key]: value } } : mem)),
    );
    if (configured && userId) {
      const member = members[idx];
      try {
        await getSupabaseBrowser()
          .from("care_circle")
          .update({ scopes: { ...member.scopes, [key]: value } })
          .eq("owner_id", userId)
          .eq("member_email", member.email);
      } catch {
        /* ignore */
      }
    }
  };

  const remove = (idx: number) => setMembers((m) => m.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Invite someone to your care circle
          </p>
          <p className="mb-3 text-sm text-slate-500">
            Choose exactly what a trusted person can see. Everything starts private — you grant each
            item explicitly. They never see your journal, raw scores, or notes.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="their@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={invite}>Invite</Button>
          </div>
          {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
        </CardBody>
      </Card>

      {members.length ? (
        <div className="space-y-3">
          {members.map((m, idx) => (
            <Card key={m.email + idx}>
              <CardBody className="pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{m.email}</p>
                    <Badge color="amber">invited</Badge>
                  </div>
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => remove(idx)}>
                    Remove
                  </Button>
                </div>
                <ul className="space-y-2">
                  {SCOPES.map((s) => (
                    <li
                      key={s.key}
                      className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0"
                    >
                      <span className="text-sm text-slate-600">{s.label}</span>
                      <Toggle
                        checked={!!m.scopes[s.key]}
                        onChange={(v) => setScope(idx, s.key, v)}
                        label={s.label}
                      />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No one in your care circle yet"
          hint="Invite a trusted friend or family member and choose what they may see."
        />
      )}
    </div>
  );
}
