import type { APIRoute } from "astro";
import {
  makeCookie,
  sign,
  verify as verifySig,
} from "../../../../lib/auth/signer";
import { getEnv, isProd } from "../../../../lib/auth/config";
import { createHmac } from "crypto";

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";
const EMAILS_URL = "https://api.github.com/user/emails";

export const GET: APIRoute = async ({ url }) => {
  // In tests, short-circuit the OAuth callback to a simple redirect
  if (getEnv("MODE") === "test") {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }
  const clientId =
    (import.meta as any).env?.GITHUB_OAUTH_CLIENT_ID ??
    process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret =
    (import.meta as any).env?.GITHUB_OAUTH_CLIENT_SECRET ??
    process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const allowedLogins = (
    ((import.meta as any).env?.GITHUB_ALLOWED_LOGINS ??
      process.env.GITHUB_ALLOWED_LOGINS) ||
    ""
  )
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const allowedOrg =
    (import.meta as any).env?.GITHUB_ALLOWED_ORG ??
    process.env.GITHUB_ALLOWED_ORG;

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!clientId || !clientSecret) {
    return new Response(
      "GitHub OAuth not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET in .env",
      { status: 500 },
    );
  }
  if (!code || !stateParam) {
    return new Response("Invalid or missing OAuth state/code", { status: 400 });
  }

  // Verify signed state and expiration
  const sessionSecret = getEnv("SESSION_SECRET");
  const payload = verifySig(stateParam, sessionSecret);
  if (!payload)
    return new Response("Invalid OAuth state signature", { status: 400 });
  let stateObj: { csrf: string; iat: number; exp: number; redirect: string };
  try {
    stateObj = JSON.parse(payload);
  } catch {
    return new Response("Invalid OAuth state payload", { status: 400 });
  }
  if (!stateObj.exp || Date.now() > stateObj.exp) {
    return new Response("OAuth state expired", { status: 400 });
  }
  const redirectTo =
    stateObj.redirect &&
    stateObj.redirect.startsWith("/") &&
    !stateObj.redirect.startsWith("//")
      ? stateObj.redirect
      : "/";

  // Exchange code for access token
  // Recompute PKCE verifier deterministically from state fields
  const code_verifier = b64url(
    createHmac("sha256", sessionSecret)
      .update(`${stateObj.csrf}.${stateObj.iat}`)
      .digest(),
  );

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier,
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token exchange failed: ${text}`, { status: 502 });
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
  };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return new Response("Missing access token in response", { status: 502 });
  }

  // Fetch basic user profile
  const userRes = await fetch(USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "ariane-app",
    },
  });
  if (!userRes.ok) {
    const txt = await userRes.text();
    return new Response(`Failed to fetch user: ${txt}`, { status: 502 });
  }
  const user = await userRes.json();

  // Enforce allowlist
  if (allowedLogins.length && !allowedLogins.includes(user?.login)) {
    return Response.redirect(
      new URL(
        "/access-denied?msg=" + encodeURIComponent("Not on the allowlist"),
        url,
      ).toString(),
      302,
    );
  }

  // Fetch primary email (GitHub may hide email on profile)
  const emailsRes = await fetch(EMAILS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "ariane-app",
    },
  });
  let email = undefined as string | undefined;
  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    email =
      emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email;
  }

  if (allowedOrg) {
    const orgRes = await fetch(
      `https://api.github.com/user/memberships/orgs/${allowedOrg}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "User-Agent": "ariane-app",
        },
      },
    );
    if (!orgRes.ok) {
      return Response.redirect(
        new URL(
          "/access-denied?msg=" + encodeURIComponent("Org membership required"),
          url,
        ).toString(),
        302,
      );
    }
    const membership = await orgRes.json();
    if (membership?.state !== "active") {
      return Response.redirect(
        new URL(
          "/access-denied?msg=" + encodeURIComponent("Org membership required"),
          url,
        ).toString(),
        302,
      );
    }
  }

  // Approval enforcement is handled by Auth0/Cloudflare Access; no Sanity check here

  // Create a signed session cookie compatible with existing session APIs
  const secret = sessionSecret;
  const now = Date.now();
  const oneWeekMs = 1000 * 60 * 60 * 24 * 7;
  const session = {
    sub: user?.id ? `github:${user.id}` : "github:unknown",
    login: user?.login,
    email: email ?? user?.email,
    iat: now,
    exp: now + oneWeekMs,
    provider: "github",
  };
  const signed = sign(JSON.stringify(session), secret);
  const cookieHeader = makeCookie("session", signed, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "Strict",
    path: "/",
    maxAge: oneWeekMs / 1000,
  });

  // Ensure absolute redirect back to the original path
  const absoluteRedirect = new URL(redirectTo, url).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: absoluteRedirect,
      "Set-Cookie": cookieHeader,
    },
  });
};
