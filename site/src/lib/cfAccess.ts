import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

export type CfAccessClaims = JWTPayload & {
  email?: string;
  groups?: string[];
  // Custom roles/groups claim key may be a URL-like namespace (e.g., Auth0 custom claim)
  [key: string]: unknown;
};

export interface VerifyOptions {
  origin: string; // e.g., https://wenzelarifiandi.com
  issuer?: string; // optional issuer to validate against
}

// Verify CF Access JWT using JWKS from the same origin
export async function verifyCfAccessJwt(token: string, opts: VerifyOptions) {
  const { origin, issuer } = opts;
  const jwksUrl = new URL("/cdn-cgi/access/certs", origin);
  const JWKS = createRemoteJWKSet(jwksUrl);
  const { payload } = await jwtVerify(token, JWKS, issuer ? { issuer } : {});
  return payload as CfAccessClaims;
}

export function getOriginFromHeaders(headers: Headers): string {
  const host =
    headers.get("x-forwarded-host") || headers.get("host") || "127.0.0.1:4321";
  const proto =
    headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function getRequiredGroupsEnv() {
  const claim = process.env.CF_ACCESS_GROUPS_CLAIM || "groups";
  const required = (process.env.CF_ACCESS_REQUIRED_GROUPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { claim, required };
}

export function getProtectedPrefixes(): string[] {
  return (process.env.CF_ACCESS_PROTECTED_PREFIXES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Approved claim support (Auth0 Action adds a namespaced boolean claim)
export function getApprovedClaimEnv() {
  // Example default: https://wenzelarifiandi.com/approved
  const claim =
    process.env.CF_ACCESS_APPROVED_CLAIM ||
    "https://wenzelarifiandi.com/approved";
  // Accept 'true' (string) or boolean true in the token
  const expected = (
    process.env.CF_ACCESS_APPROVED_VALUE ?? "true"
  ).toLowerCase();
  return { claim, expected };
}

export function isApprovedFromClaims(claims: Record<string, unknown>): boolean {
  const { claim, expected } = getApprovedClaimEnv();
  const val = claims[claim] as unknown;
  if (typeof val === "boolean") return String(val).toLowerCase() === expected;
  if (typeof val === "string") return val.toLowerCase() === expected;
  // Some IdPs nest custom claims; allow simple dot-path fallback
  if (claim.includes(".")) {
    const parts = claim.split(".");
    let cur: unknown = claims;
    for (const p of parts) {
      if (!cur || typeof cur !== "object") return false;
      cur = (cur as Record<string, unknown>)[p];
    }
    if (typeof cur === "boolean") return String(cur).toLowerCase() === expected;
    if (typeof cur === "string") return cur.toLowerCase() === expected;
  }
  return false;
}

export function shouldEnforceApproved(): boolean {
  const v = (process.env.CF_ACCESS_ENFORCE_APPROVED ?? "false").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
