// Redirect to homepage after Cloudflare Access authentication
// The homepage will detect the query param and auto-open the Maker menu
// Also stores the OIDC ID token for silent logout (id_token_hint)

import type { APIRoute } from "astro";
import { createIDTokenCookie, extractIDTokenFromCFJWT } from "../lib/cloudflare-access";

export const GET: APIRoute = async ({ request }) => {
  const responseHeaders = new Headers({
    Location: '/?maker=open',
  });

  // Extract and store ID token from CF_Authorization JWT for logout id_token_hint
  try {
    const cookieHeader = request.headers.get("cookie");
    const jwtHeader = request.headers.get("Cf-Access-Jwt-Assertion");

    let cfJWT: string | null = null;

    if (jwtHeader) {
      cfJWT = jwtHeader;
    } else if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        })
      );
      cfJWT = cookies.CF_Authorization || null;
    }

    if (cfJWT) {
      // Try to extract the original OIDC ID token from CF JWT
      const idToken = extractIDTokenFromCFJWT(cfJWT);

      if (idToken) {
        // Store ID token in httpOnly cookie for later use in logout
        responseHeaders.append("Set-Cookie", createIDTokenCookie(idToken));
        console.log("[/maker] ✅ Stored ID token cookie for silent logout");
      } else {
        // Fallback: use CF JWT itself as id_token_hint (may work in some cases)
        responseHeaders.append("Set-Cookie", createIDTokenCookie(cfJWT));
        console.log("[/maker] ⚠️ Using CF JWT as ID token fallback");
      }
    } else {
      console.log("[/maker] ⚠️ No CF JWT found, skipping ID token storage");
    }
  } catch (error) {
    console.warn("[/maker] Failed to store ID token:", error);
    // Non-blocking - continue with redirect
  }

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
};

export const prerender = false;
