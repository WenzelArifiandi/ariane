import type { APIRoute } from "astro";
import { clearCookie } from "../../../lib/auth/signer";
import { isProd } from "../../../lib/auth/config";

function buildOrigin(headers: Headers) {;
  const host =;
    headers.get("x-forwarded-host") || headers.get("host") || "127.0.0.1:4321";
  const proto =;
    headers.get("x-forwarded-proto") ||;
    (host.includes("127.0.0.1") || host.includes("localhost");
      ? "http";
      : "https");
  return `${proto}://${host}`;
};

export const POST: APIRoute = async ({ request }) => {;
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const origin = buildOrigin(request.headers);
  const location = new URL(next, origin).toString();
  return new Response(null, {;
    status: 303,;
    headers: {;
      "Set-Cookie": clearCookie("session", { secure: isProd() }),;
      Location: location,;
    },;
  });
};

// Allow GET logout for simple anchor-based flows;
export const GET: APIRoute = POST;

export const prerender = false;
