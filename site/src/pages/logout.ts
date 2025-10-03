// Unified logout flow: Cipher (ZITADEL) → Cloudflare Access → /
// This endpoint orchestrates a complete logout by redirecting through both identity providers

import type { APIRoute } from "astro";
import { verifyCloudflareAccessJWT, readIDTokenCookie, clearIDTokenCookie } from "../lib/cloudflare-access";

export const GET: APIRoute = async ({ request }) => {
  console.log("[Unified Logout] 🚪 Starting unified logout flow");

  // Get OIDC configuration from environment
  const CIPHER_OIDC_CLIENT_ID =
    import.meta.env.PUBLIC_OIDC_CLIENT_ID ||
    process.env.PUBLIC_OIDC_CLIENT_ID ||
    "340307158316941421";

  const CIPHER_ISSUER = "https://cipher.wenzelarifiandi.com";
  const CF_TEAM_DOMAIN = "wenzelarifiandi.cloudflareaccess.com";
  const FINAL_RETURN_URL = "https://wenzelarifiandi.com/";

  // Step 1: Fire-and-forget SLO API call to revoke ZITADEL sessions
  const user = await verifyCloudflareAccessJWT(request);
  if (user?.email) {
    console.log(`[Unified Logout] 📧 User identified: ${user.email}`);

    // Trigger service-user session revocation (fire-and-forget)
    const sloUrl = new URL("/api/zitadel/slo", request.url);
    fetch(sloUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") || "",
      },
    }).catch((error) => {
      // Don't block UX on SLO API failure
      console.warn("[Unified Logout] ⚠️ SLO API call failed (non-blocking):", error.message);
    });

    console.log("[Unified Logout] 🔥 Triggered fire-and-forget SLO API call for", user.email);
  } else {
    console.log("[Unified Logout] ⚠️ No user session found, skipping SLO API call");
  }

  // Step 2: Build redirect chain
  // Final destination after all logouts
  const cloudflareLogoutUrl = `https://${CF_TEAM_DOMAIN}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(FINAL_RETURN_URL)}`;

  // ZITADEL end_session with post_logout_redirect_uri pointing to Cloudflare Access logout
  const cipherLogoutUrl = new URL(`${CIPHER_ISSUER}/oidc/v1/end_session`);
  cipherLogoutUrl.searchParams.set("client_id", CIPHER_OIDC_CLIENT_ID);
  cipherLogoutUrl.searchParams.set("post_logout_redirect_uri", cloudflareLogoutUrl);

  // Step 2.5: Add id_token_hint for silent logout (no account picker)
  const idToken = readIDTokenCookie(request);
  const responseHeaders = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate",
  });

  if (idToken) {
    cipherLogoutUrl.searchParams.set("id_token_hint", idToken);
    console.log("[Unified Logout] 🎯 Using id_token_hint for silent logout (no account picker)");

    // Clear the ID token cookie
    responseHeaders.append("Set-Cookie", clearIDTokenCookie());
  } else {
    console.log("[Unified Logout] ⚠️ No id_token_hint available - ZITADEL may show account picker");
  }

  console.log("[Unified Logout] 🔗 Redirect chain:");
  console.log("[Unified Logout]   1️⃣ Cipher/ZITADEL end_session:", cipherLogoutUrl.toString());
  console.log("[Unified Logout]   2️⃣ Cloudflare Access logout:", cloudflareLogoutUrl);
  console.log("[Unified Logout]   3️⃣ Final destination:", FINAL_RETURN_URL);
  console.log("[Unified Logout] ✅ Cipher cookie will be cleared → Access cleared → returned to /");

  // Step 3: Redirect to ZITADEL end_session (starts the chain)
  responseHeaders.set("Location", cipherLogoutUrl.toString());

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
};

export const prerender = false;
