/** Tracks the last few document IDs the user opened, for the command palette's
 *  "Recent" group. Stored in localStorage; capped at 5, most-recent first. */

const KEY = "recent-docs";
const CAP = 5;

export function recordRecentDoc(id: string): void {
  if (!id) return;
  try {
    const list = getRecentDocs().filter((x) => x !== id);
    list.unshift(id);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP)));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function getRecentDocs(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
