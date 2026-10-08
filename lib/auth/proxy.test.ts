import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "@/proxy";
import { SESSION_COOKIE, SESSION_MARKER_COOKIE } from "./session";

function jwt(expSeconds: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ exp: expSeconds })}.sig`;
}

function visit(path: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(path, "https://govern.example.com"));
  for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v);
  return proxy(req);
}

const now = Math.floor(Date.now() / 1000);

describe("proxy session gate", () => {
  it("sends a visitor with no session to sign in", () => {
    const res = visit("/contracts");
    expect(res.headers.get("location")).toContain("/login?redirect=%2Fcontracts");
  });

  it("lets a valid ID token through", () => {
    const res = visit("/contracts", { [SESSION_COOKIE]: jwt(now + 600) });
    expect(res.headers.get("location")).toBeNull();
  });

  // The bug: the ID token expires after an hour while the refresh-token
  // session is still good. That must not read as signed out.
  it("lets an expired ID token through when the session marker is present", () => {
    const res = visit("/contracts", { [SESSION_COOKIE]: jwt(now - 600), [SESSION_MARKER_COOKIE]: "1" });
    expect(res.headers.get("location")).toBeNull();
  });

  it("still signs out an expired token with no session marker", () => {
    const res = visit("/contracts", { [SESSION_COOKIE]: jwt(now - 600) });
    expect(res.headers.get("location")).toContain("/login");
  });
});
