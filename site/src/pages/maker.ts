// Redirect to homepage after Cloudflare Access authentication
// The homepage will detect the query param and auto-open the Maker menu
// Also stores the OIDC ID token for silent logout (id_token_hint) - ONLY if valid ZITADEL token

import type { APIRoute } from "astro";
import {
  createIDTokenCookie,
  extractIDTokenFromCFJWT,
  isValidZITADELIDToken,
} from "../lib/cloudflare-access";

const CIPHER_OIDC_CLIENT_ID = "340307158316941421";

export const GET: APIRoute = async ({ request, url }) => {
  // Check for OIDC errors (e.g., expired requestId from ZITADEL)
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    console.warn(
      `[/maker] OIDC error detected: ${error}`,
      errorDescription ? `- ${errorDescription}` : ""
    );

    // If error relates to expired/invalid authorization request, restart flow
    // This handles the case where ZITADEL requestId expires (one-time use)
    if (
      errorDescription?.toLowerCase().includes("request") ||
      errorDescription?.toLowerCase().includes("expired") ||
      error === "invalid_request"
    ) {
      console.log(
        "[/maker] Restarting OAuth flow - clearing error state and redirecting"
      );
      // Redirect to /maker without error params to trigger fresh auth
      return Response.redirect(
        new URL("/maker", url.origin).toString(),
        302
      );
    }

    // For other errors, log and continue - may need manual intervention
    console.error(
      "[/maker] Unhandled OIDC error - continuing with redirect:",
      error
    );
  }

  const responseHeaders = new Headers({
    Location: "/?maker=open",
  });

  // Extract and store ID token from CF_Authorization JWT for logout id_token_hint
  // ONLY store if it's a genuine ZITADEL ID token (not CF Access JWT)
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
      // Try to extract the original OIDC ID token from CF JWT custom claims
      const idToken = extractIDTokenFromCFJWT(cfJWT);

      if (idToken) {
        // Validate that it's a genuine ZITADEL ID token for our client
        if (isValidZITADELIDToken(idToken, CIPHER_OIDC_CLIENT_ID)) {
          // Store validated ZITADEL ID token for silent logout
          responseHeaders.append("Set-Cookie", createIDTokenCookie(idToken));
          console.log(
            "[/maker] ✅ Stored valid ZITADEL ID token for silent logout"
          );
        } else {
          console.log(
            "[/maker] ⚠️ Extracted token is not a valid ZITADEL ID token - not storing"
          );
        }
      } else {
        // No ID token found in CF JWT - this is normal for Access-only flow
        console.log(
          "[/maker] ℹ️ No ZITADEL ID token in CF JWT (Access-only flow) - silent logout unavailable"
        );
      }
    } else {
      console.log("[/maker] ⚠️ No CF JWT found, skipping ID token storage");
    }
  } catch (error) {
    console.warn("[/maker] Failed to process ID token:", error);
    // Non-blocking - continue with redirect
  }

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
};

export const prerender = false;
