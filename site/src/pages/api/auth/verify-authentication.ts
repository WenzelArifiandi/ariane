import type { APIRoute } from "astro";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
  getOriginFromRequest,
  getRpIdFromOrigin,
  isProd,
  getEnv,
} from "../../../lib/auth/config";
import {
  verify as verifySig,
  makeCookie,
  sign,
} from "../../../lib/auth/signer";
import { store } from "../../../lib/auth/store";

const USER_ID = "admin";

export const POST: APIRoute = async ({ request }) => {
  const origin = getOriginFromRequest(request);
  const rpID = getRpIdFromOrigin(origin);
  const body = await request.json();

  const secret = getEnv("SESSION_SECRET", "dev-secret-change-me");
  const chalCookie = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith("webauthn_chal="));
  if (!chalCookie) return new Response("Missing challenge", { status: 400 });
  const signed = decodeURIComponent(chalCookie.split("=")[1]);
  const payload = verifySig(signed, secret);
  if (!payload) return new Response("Bad challenge", { status: 400 });
  const { c: expectedChallenge } = JSON.parse(payload);

  // Find credential by ID sent by the browser
  const credId = body?.id as string;
  const stored = credId ? store.getById(credId) : undefined;
  if (!stored) return new Response("Unknown credential", { status: 400 });

  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    authenticator: {
      credentialID: stored.id, // already base64url string
      credentialPublicKey: Buffer.from(stored.publicKey, "base64url"),
      counter: stored.counter,
      // transports: stored.transports, // omit if not matching type
    },
  });

  if (!verified || !authenticationInfo)
    return new Response(JSON.stringify({ verified: false }), { status: 401 });

  // Update counter to prevent cloned authenticator replay
  store.upsert({ ...stored, counter: authenticationInfo.newCounter });

  const session = {
    sub: USER_ID,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const sessionCookie = makeCookie(
    "session",
    sign(JSON.stringify(session), secret),
    {
      httpOnly: true,
      secure: isProd(),
      sameSite: "Strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );

  return new Response(JSON.stringify({ verified: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookie,
    },
  });
};

export const prerender = false;
