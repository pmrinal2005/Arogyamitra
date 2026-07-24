"use client";
// Journaling Studio: distraction-free editor + prompt library + native Web Speech
// voice input (free, no external speech API). On save we run the on-device crisis
// guard FIRST (synchronous), then write the entry (the async NLP Edge Function
// fills sentiment/themes later). History is searchable with mood-linked colours;
// export is available as JSON / CSV / print-to-PDF.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Button, Textarea, Input, Badge, EmptyState } from "@/components/ui";
import { JOURNAL_PROMPTS } from "@/lib/constants";
import { useJournal } from "@/lib/hooks";
import { submitJournal } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { useCrisisGuard } from "@/lib/use-crisis-guard";
import { fmtDate } from "@/lib/utils";
import type { JournalEntry } from "@/lib/types";

function sentimentColor(score: number | null): string {
  if (score == null) return "#94a3b8";
  if (score > 0.15) return "#16a34a";
  if (score < -0.15) return "#dc2626";
  return "#d97706";
}

// Minimal typing for the (prefixed) Web Speech API.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

export default function JournalPage() {
  const userId = useApp((s) => s.userId);
  const qc = useQueryClient();
  const { scanText } = useCrisisGuard();
  const { data: entries } = useJournal();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inputMethod, setInputMethod] = useState<"typed" | "voice">("typed");
  const [listening, setListening] = useState(false);
  const [search, setSearch] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const toggleVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let chunk = "";
      for (let i = 0; i < e.results.length; i++) chunk += e.results[i][0].transcript + " ";
      setText((prev) => (prev ? prev + " " : "") + chunk.trim());
      setInputMethod("voice");
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const save = async () => {
    if (!text.trim()) return;
    // Crisis scan runs synchronously, on-device, BEFORE any network/LLM call.
    scanText(text, "journal_keyword");
    setBusy(true);
    await submitJournal(userId, text.trim(), inputMethod);
    setBusy(false);
    setText("");
    setInputMethod("typed");
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["bhi-history"] });
    setTimeout(() => setSaved(false), 2500);
  };

  const filtered = useMemo(() => {
    const list = entries ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) =>
        e.content.toLowerCase().includes(q) ||
        (e.nlp_themes ?? []).some((tm) => tm.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  const exportJson = () => downloadFile(JSON.stringify(entries ?? [], null, 2), "journal.json", "application/json");
  const exportCsv = () => {
    const rows = [
      ["date", "input_method", "sentiment", "themes", "content"],
      ...(entries ?? []).map((e) => [
        e.created_at,
        e.input_method,
        String(e.nlp_sentiment_score ?? ""),
        (e.nlp_themes ?? []).join("|"),
        `"${e.content.replace(/"/g, '""')}"`,
      ]),
    ];
    downloadFile(rows.map((r) => r.join(",")).join("\n"), "journal.csv", "text/csv");
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Journaling studio</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardBody className="pt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  New entry
                </p>
                {voiceSupported && (
                  <Button
                    variant={listening ? "danger" : "outline"}
                    onClick={toggleVoice}
                    className="px-3 py-1 text-xs"
                  >
                    <i className={`bi ${listening ? "bi-stop-circle" : "bi-mic"}`} aria-hidden />
                    {listening ? "Stop" : "Voice"}
                  </Button>
                )}
              </div>
              <Textarea
                rows={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setInputMethod("typed");
                }}
                placeholder="Write freely. Nothing here is graded or judged."
              />
              <div className="mt-3 flex items-center gap-3">
                <Button onClick={save} disabled={busy || !text.trim()}>
                  {busy ? "Saving…" : "Save entry"}
                </Button>
                {saved && <span className="text-sm text-green-600">Saved ✓</span>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="pt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  History
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={exportJson}>
                    JSON
                  </Button>
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={exportCsv}>
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => window.print()}
                  >
                    Print / PDF
                  </Button>
                </div>
              </div>
              <Input
                className="mb-3"
                placeholder="Search entries or themes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {filtered.length ? (
                <ul className="space-y-3">
                  {filtered.map((e) => (
                    <JournalRow key={e.id} entry={e} />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No entries yet" hint="Start when you're ready — there's no wrong way." />
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardBody className="pt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Prompts
              </p>
              <ul className="space-y-2">
                {JOURNAL_PROMPTS.map((p) => (
                  <li key={p}>
                    <button
                      onClick={() => setText((prev) => (prev ? prev + "\n\n" : "") + p + "\n")}
                      className="w-full rounded-lg bg-slate-50 p-2 text-left text-sm text-slate-600 hover:bg-slate-100"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function JournalRow({ entry }: { entry: JournalEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={open}
      >
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ background: sentimentColor(entry.nlp_sentiment_score) }}
          title="Mood-linked colour"
        />
        <span className="min-w-0 flex-1">
          <span className={open ? "text-sm text-slate-700" : "line-clamp-1 text-sm text-slate-700"}>
            {entry.content}
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            {fmtDate(entry.created_at)} · {entry.input_method}
            {entry.nlp_status === "pending" && " · analysing…"}
          </span>
        </span>
      </button>
      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-brand-700">AI Reflection</p>
          {entry.nlp_status === "done" ? (
            <>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(entry.nlp_themes ?? []).map((tm) => (
                  <Badge key={tm} color="brand">
                    {tm}
                  </Badge>
                ))}
                {!(entry.nlp_themes ?? []).length && (
                  <span className="text-xs text-slate-400">No themes extracted.</span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                This is a supportive reflection, not a clinical analysis.
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              Reflection will appear once analysis completes (or the entry stays private if you
              haven&apos;t consented to NLP).
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
