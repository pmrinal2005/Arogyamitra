"use client";
// ---------------------------------------------------------------------------
// Offline write queue (IndexedDB). EMA/journal submissions made while offline
// are stored here and flushed to Supabase automatically once connectivity
// returns. Zero external deps — a tiny hand-rolled IndexedDB wrapper so the PWA
// stays lightweight and Vercel-Hobby-friendly.
// ---------------------------------------------------------------------------

export type QueuedKind = "ema" | "journal" | "scale" | "manual_metric";

export interface QueuedItem {
  id: string; // client-generated uuid
  kind: QueuedKind;
  userId: string | null;
  payload: Record<string, unknown>;
  queued_at: string;
}

const DB_NAME = "arogyasetu-offline";
const STORE = "write-queue";
const VERSION = 1;

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function enqueue(
  kind: QueuedKind,
  userId: string | null,
  payload: Record<string, unknown>,
): Promise<QueuedItem | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDb();
    const item: QueuedItem = {
      id: uuid(),
      kind,
      userId,
      payload,
      queued_at: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    // Ask the SW to register a background sync if supported.
    try {
      const reg = await navigator.serviceWorker?.ready;
      // @ts-expect-error sync is not in all TS lib versions
      await reg?.sync?.register?.("arogyasetu-sync");
    } catch {
      /* background sync optional */
    }
    return item;
  } catch {
    return null;
  }
}

export async function listQueue(): Promise<QueuedItem[]> {
  if (!hasIDB()) return [];
  try {
    const db = await openDb();
    const items = await new Promise<QueuedItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as QueuedItem[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items;
  } catch {
    return [];
  }
}

export async function removeItem(id: string): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

// Flush the queue to Supabase. Accepts the concrete writers to avoid a circular
// import with lib/actions. Each writer returns { ok }. Successful items are
// removed from the queue; failures stay for the next attempt.
export interface QueueWriters {
  ema: (userId: string | null, payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
  journal: (userId: string | null, payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
  scale: (userId: string | null, payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
  manual_metric: (userId: string | null, payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
}

export async function flushQueue(writers: QueueWriters): Promise<{ flushed: number; remaining: number }> {
  const items = await listQueue();
  let flushed = 0;
  for (const item of items) {
    try {
      const writer = writers[item.kind];
      if (!writer) continue;
      const res = await writer(item.userId, item.payload);
      if (res.ok) {
        await removeItem(item.id);
        flushed += 1;
      }
    } catch {
      /* keep in queue for next attempt */
    }
  }
  const remaining = (await listQueue()).length;
  return { flushed, remaining };
}
