// Unified logout flow with branching:
// - If valid ZITADEL ID token: Cipher → Cloudflare Access → /
// - If no valid token: Skip Cipher, go directly to Cloudflare Access → /

import type { APIRoute } from "astro";
import {
  verifyCloudflareAccessJWT,
  readIDTokenCookie,
  clearIDTokenCookie,
  isValidZITADELIDToken,
} from "../lib/cloudflare-access";

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

  const responseHeaders = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate",
  });

  // Step 1: Check for valid ZITADEL ID token to determine logout path
  const idToken = readIDTokenCookie(request);
  const hasValidZitadelToken =
    idToken && isValidZITADELIDToken(idToken, CIPHER_OIDC_CLIENT_ID);

  // Step 2: Fire-and-forget SLO API call to revoke ZITADEL sessions (only if we have a token)
  if (hasValidZitadelToken) {
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
        console.warn(
          "[Unified Logout] ⚠️ SLO API call failed (non-blocking):",
          error.message
        );
      });

      console.log(
        "[Unified Logout] 🔥 Triggered fire-and-forget SLO API call for",
        user.email
      );
    }
  }

  // Step 3: Build logout redirect based on whether we have a valid ZITADEL token
  const cloudflareLogoutUrl = `https://${CF_TEAM_DOMAIN}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(FINAL_RETURN_URL)}`;

  let logoutRedirectUrl: string;

  if (hasValidZitadelToken) {
    // BRANCH A: Valid ZITADEL ID token → Go through Cipher end_session first
    const cipherLogoutUrl = new URL(`${CIPHER_ISSUER}/oidc/v1/end_session`);
    cipherLogoutUrl.searchParams.set("client_id", CIPHER_OIDC_CLIENT_ID);
    cipherLogoutUrl.searchParams.set(
      "post_logout_redirect_uri",
      cloudflareLogoutUrl
    );
    cipherLogoutUrl.searchParams.set("id_token_hint", idToken!);

    logoutRedirectUrl = cipherLogoutUrl.toString();

    console.log(
      "[Unified Logout] 🎯 Branch A: Valid ZITADEL token - using Cipher end_session"
    );
    console.log("[Unified Logout] 🔗 Redirect chain:");
    console.log("[Unified Logout]   1️⃣ Cipher end_session (silent):", logoutRedirectUrl);
    console.log("[Unified Logout]   2️⃣ Cloudflare Access logout:", cloudflareLogoutUrl);
    console.log("[Unified Logout]   3️⃣ Final destination:", FINAL_RETURN_URL);

    // Clear the ID token cookie
    responseHeaders.append("Set-Cookie", clearIDTokenCookie());
  } else {
    // BRANCH B: No valid ZITADEL token → Skip Cipher, go directly to CF Access logout
    logoutRedirectUrl = cloudflareLogoutUrl;

    console.log(
      "[Unified Logout] ⚡ Branch B: No valid ZITADEL token - skipping Cipher, direct to CF Access"
    );
    console.log("[Unified Logout] 🔗 Redirect chain:");
    console.log("[Unified Logout]   1️⃣ Cloudflare Access logout:", cloudflareLogoutUrl);
    console.log("[Unified Logout]   2️⃣ Final destination:", FINAL_RETURN_URL);

    // Clear any stale ID token cookie
    if (idToken) {
      responseHeaders.append("Set-Cookie", clearIDTokenCookie());
    }
  }

  console.log(
    "[Unified Logout] ✅ Logout complete - no account picker, smooth redirect"
  );

  // Step 4: Redirect to start the logout chain
  responseHeaders.set("Location", logoutRedirectUrl);

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
};

export const prerender = false;
