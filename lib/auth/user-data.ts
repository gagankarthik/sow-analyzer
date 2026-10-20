// What belongs to ONE signed-in person in this browser, so it can be dropped
// when they sign out or a different person signs in (shared machines, a second
// tab signing in as someone else). Pure functions, so they are unit tested.

/**
 * localStorage keys that hold a user's work or history (drafts, recent
 * documents and palette picks, read receipts, saved filters, onboarding
 * answers). Cleared at sign-out. UI preferences (sidebar, table density,
 * column layout, export format) hold no one's data and stay.
 */
const PERSONAL_STORAGE: readonly RegExp[] = [
  /^blueiq:/,
  /^recent-docs$/,
  /^biq-notif-read$/,
  /^biq-dashboard-filters$/,
  // Command palette "recent" entries carry document / contract titles and ids.
  /^palette:recent$/,
];

export function isPersonalStorageKey(key: string): boolean {
  return PERSONAL_STORAGE.some((re) => re.test(key));
}

/**
 * Should the in-memory server-state cache (TanStack Query) be dropped when the
 * signed-in user goes from `lastSub` to `nextSub`? Yes whenever the person who
 * owned the cached data is no longer the one signed in: sign-out (next = null)
 * or a switch to another account. The very first sign-in (nothing cached for
 * anyone yet) and token refreshes for the same user keep the cache.
 */
export function shouldClearUserCache(lastSub: string | null, nextSub: string | null): boolean {
  return lastSub !== null && nextSub !== lastSub;
}
