import { describe, expect, it } from "vitest";
import { isPersonalStorageKey, shouldClearUserCache } from "./user-data";

describe("isPersonalStorageKey", () => {
  it("matches every key that holds a user's data", () => {
    for (const key of [
      "blueiq:sow:answers",
      "blueiq:sow:draft",
      "blueiq:onboarding:abc",
      "blueiq:last-activity",
      "recent-docs",
      "biq-notif-read",
      "biq-dashboard-filters",
      "palette:recent",
    ]) {
      expect(isPersonalStorageKey(key), key).toBe(true);
    }
  });

  it("keeps UI preferences and Cognito's own session keys", () => {
    for (const key of [
      "sidebar:collapsed",
      "palette:preview",
      "contracts-list-density",
      "contracts-list-columns",
      "blueiq.export.format",
      // Cognito's SDK removes its own keys in user.signOut().
      "CognitoIdentityServiceProvider.client.LastAuthUser",
    ]) {
      expect(isPersonalStorageKey(key), key).toBe(false);
    }
  });
});

describe("shouldClearUserCache", () => {
  it("keeps the cache for the first sign-in and for the same user", () => {
    expect(shouldClearUserCache(null, null)).toBe(false);
    expect(shouldClearUserCache(null, "a")).toBe(false);
    expect(shouldClearUserCache("a", "a")).toBe(false);
  });

  it("drops the cache on sign-out and when another account signs in", () => {
    expect(shouldClearUserCache("a", null)).toBe(true);
    expect(shouldClearUserCache("a", "b")).toBe(true);
  });
});
