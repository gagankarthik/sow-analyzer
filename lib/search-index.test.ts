import { describe, expect, it } from "vitest";
import {
  emptyView, parseRecent, pushRecent, rankHits, scoreHit, searchHits, startsWord, toRecent,
  type SearchHit,
} from "./search-index";

const hit = (id: string, label: string, group: SearchHit["group"] = "Contracts", extra: Partial<SearchHit> = {}): SearchHit => ({
  id, label, sub: "", group, icon: "contract", href: `/x/${id}`, ...extra,
});

describe("startsWord", () => {
  it("matches at the start or after a separator", () => {
    expect(startsWord("master services agreement", "serv")).toBe(true);
    expect(startsWord("acme-nda", "nda")).toBe(true);
    expect(startsWord("agenda", "nda")).toBe(false);
  });
});

describe("scoreHit", () => {
  it("orders exact > prefix > word-start > substring > secondary text", () => {
    const t = "nda";
    const exact = scoreHit(hit("1", "NDA"), t);
    const prefix = scoreHit(hit("2", "NDA with Acme"), t);
    const word = scoreHit(hit("3", "Acme NDA"), t);
    const sub = scoreHit(hit("4", "Agenda"), t);
    const secondary = scoreHit(hit("5", "Acme", "Contracts", { sub: "Mutual NDA" }), t);
    const keyword = scoreHit(hit("6", "Acme", "Contracts", { keywords: "xnday" }), t);
    expect([exact, prefix, word, sub, secondary, keyword]).toEqual([100, 80, 60, 40, 20, 10]);
  });

  it("matches multi-word queries word by word", () => {
    expect(scoreHit(hit("1", "Mutual NDA", "Contracts", { sub: "Acme Corp" }), "acme nda")).toBe(5);
    expect(scoreHit(hit("1", "Mutual NDA"), "acme nda")).toBe(0);
  });

  it("returns 0 when nothing matches", () => {
    expect(scoreHit(hit("1", "Lease"), "nda")).toBe(0);
  });
});

describe("rankHits", () => {
  const hits = [hit("a", "Agenda"), hit("b", "Acme NDA"), hit("c", "NDA"), hit("d", "Lease"), hit("e", "Beta NDA")];
  it("ranks best first, keeps index order on ties, drops misses", () => {
    expect(rankHits(hits, "  NDA ").map((h) => h.id)).toEqual(["c", "b", "e", "a"]);
  });
  it("honours the limit", () => {
    expect(rankHits(hits, "nda", 2).map((h) => h.id)).toEqual(["c", "b"]);
  });
});

describe("searchHits", () => {
  const hits = [
    hit("c1", "Acme master agreement"),
    hit("c2", "Acme NDA"),
    hit("c3", "Beta lease"),
    hit("d1", "Acme invoice", "Documents"),
    hit("p1", "Settings", "Pages"),
    hit("a1", "Go to Settings", "Actions"),
  ];

  it("groups matches with counts and orders groups by their best match", () => {
    const view = searchHits(hits, "settings");
    expect(view.groups.map((g) => g.label)).toEqual(["Pages", "Actions"]);
    expect(view.flat.map((h) => h.id)).toEqual(["p1", "a1"]);
  });

  it("caps each group under All but reports the full count", () => {
    const view = searchHits(hits, "acme", "All", { perGroup: 1 });
    const contracts = view.groups.find((g) => g.label === "Contracts")!;
    expect(contracts.count).toBe(2);
    expect(contracts.items).toHaveLength(1);
    expect(view.counts).toEqual({ Contracts: 2, Documents: 1, Projects: 0, Pages: 0, Actions: 0 });
  });

  it("filters to one category while keeping every category's count", () => {
    const view = searchHits(hits, "acme", "Documents");
    expect(view.groups.map((g) => g.label)).toEqual(["Documents"]);
    expect(view.flat.map((h) => h.id)).toEqual(["d1"]);
    expect(view.counts.Contracts).toBe(2);
  });

  it("lists the whole category when the query is empty", () => {
    const view = searchHits(hits, "", "Contracts");
    expect(view.flat.map((h) => h.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("returns no groups when nothing matches", () => {
    const view = searchHits(hits, "zzz");
    expect(view.groups).toEqual([]);
    expect(view.flat).toEqual([]);
  });
});

describe("recent items", () => {
  it("moves the opened hit to the front without duplicates and caps the list", () => {
    let list = [toRecent(hit("a", "A")), toRecent(hit("b", "B"))];
    list = pushRecent(list, hit("b", "B"));
    expect(list.map((r) => r.id)).toEqual(["b", "a"]);
    for (let i = 0; i < 10; i++) list = pushRecent(list, hit(`n${i}`, `N${i}`));
    expect(list).toHaveLength(8);
    expect(list[0].id).toBe("n9");
  });

  it("parses stored JSON defensively", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent("{}")).toEqual([]);
    expect(parseRecent(JSON.stringify([{ id: "a", label: "A", group: "Bogus" }, { id: "b", label: "B", group: "Pages", sub: "" }])))
      .toEqual([{ id: "b", label: "B", group: "Pages", sub: "" }]);
  });

  it("shows recents (live when available) then the actions for an empty query", () => {
    const live = hit("c1", "Acme renamed");
    const action = hit("a1", "Ask Sonar", "Actions", { href: undefined, command: "sonar" });
    const recent = [toRecent(hit("c1", "Acme")), toRecent(hit("gone", "Gone")), { id: "dead", label: "Dead", sub: "", group: "Pages" as const, icon: "page" as const }];
    const view = emptyView([live, action], recent);
    expect(view.groups.map((g) => g.label)).toEqual(["Recent", "Actions"]);
    expect(view.groups[0].items.map((h) => h.label)).toEqual(["Acme renamed", "Gone"]);
    expect(view.flat.map((h) => h.id)).toEqual(["c1", "gone", "a1"]);
  });
});
