import { initialState, type History } from "./exploration.ts";
import {
  LEGACY_KEYS,
  migrate,
  migrateHistory,
  legacyTab,
} from "./migration.ts";
export const STATE_KEY = "kgb:exploration:v6";
export type Session = {
  savedAt: number;
  history: History;
  selection?: string | null;
  tab?: string;
};
let dbPromise: Promise<IDBDatabase> | undefined;
function database() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("kgb-exploration", 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("sessions"))
        r.result.createObjectStore("sessions");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
async function readIdb(key: string) {
  try {
    const db = await database();
    return await new Promise<any>((resolve, reject) => {
      const r = db.transaction("sessions").objectStore("sessions").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}
function readLocal(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export async function saveBrowserSession(history: History) {
  const session: Session = { savedAt: Date.now(), history };
  let local = false,
    idb = false;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(session));
    local = true;
  } catch {}
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("sessions", "readwrite");
      t.objectStore("sessions").put(session, STATE_KEY);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
    idb = true;
  } catch {}
  if (!local && !idb)
    throw new Error(
      "Browser storage is unavailable. Use Save view to preserve this exploration in the local application.",
    );
}
export async function restoreBrowserSession(): Promise<Session> {
  const local = readLocal(STATE_KEY),
    mirror = await readIdb(STATE_KEY),
    newest = [local, mirror]
      .filter((v) => v?.history?.entries?.length)
      .sort((a, b) => b.savedAt - a.savedAt)[0];
  if (newest) {
    const h = newest.history;
    return {
      ...newest,
      history: migrateHistory(h, h.entries[h.index], h.index),
    };
  }
  for (const key of LEGACY_KEYS) {
    const l = readLocal(key),
      m = await readIdb(key);
    if (!l && !m) continue;
    const timestamp = Number(readLocal(key + ":saved-at") || 0),
      state = m && m.savedAt > timestamp ? m.state : l || m?.state;
    const rawHistory =
      m && m.savedAt > timestamp
        ? m.history
        : readLocal(key + ":history") || m?.history;
    return {
      savedAt: Date.now(),
      history: migrateHistory(rawHistory, state),
      selection: state?.selected || null,
      tab: legacyTab(state),
    };
  }
  return {
    savedAt: Date.now(),
    history: { entries: [initialState()], index: 0 },
  };
}
