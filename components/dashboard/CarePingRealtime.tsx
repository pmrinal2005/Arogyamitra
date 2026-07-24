"use client";
// Subscribes to Supabase Realtime for incoming Care Pings addressed to this user
// and time-credit ledger changes. On a new ping it invalidates queries and fires
// a Web Push / native notification when the tab is unfocused.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";

export default function CarePingRealtime() {
  const userId = useApp((s) => s.userId);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    const sb = getSupabaseBrowser();

    const channel = sb
      .channel(`care-pings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "care_pings",
          filter: `matched_user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["care-pings"] });
          notify("A neighbour may need support", "A new Care Ping just arrived.");
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_credits_ledger" },
        () => qc.invalidateQueries({ queryKey: ["time-credits"] }),
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [userId, qc]);

  return null;
}

function notify(title: string, body: string) {
  try {
    if (typeof document !== "undefined" && document.hasFocus()) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body });
      });
    }
  } catch {
    /* ignore */
  }
}
