import type { APIRoute } from "astro";
import {
  getOriginFromHeaders,
  verifyCfAccessJwt,
  isApprovedFromClaims,
} from "../../../lib/cfAccess";

export const GET: APIRoute = async ({ request }) => {
  try {
    const token = request.headers.get("cf-access-jwt-assertion");
    const origin = getOriginFromHeaders(request.headers);
    let approved = false;
    if (token) {
      try {
        const claims = await verifyCfAccessJwt(token, { origin });
        approved = isApprovedFromClaims(claims as any);
      } catch {}
    }
    return new Response(JSON.stringify({ approved }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ approved: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
