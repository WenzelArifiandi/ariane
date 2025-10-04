// ZITADEL Single Logout (SLO) API endpoint
// Called client-side after Cloudflare Access logout to revoke ZITADEL sessions

import type { APIRoute } from "astro";
import { revokeAllUserSessions } from "../../../lib/zitadel-service";
import { readSLOCookie, clearSLOCookie } from "../../../lib/cloudflare-access";

export const POST: APIRoute = async ({ request }) => {
  try {
    // Read user email from short-lived SLO cookie
    const userEmail = readSLOCookie(request);

    if (!userEmail) {
      console.debug("[SLO API] No SLO cookie found (normal for new logout flow)");
      return new Response(
        JSON.stringify({ error: "No SLO session found" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": clearSLOCookie(), // Clear cookie anyway
          },
        }
      );
    }

    console.log("[SLO API] 🚪 Revoking ZITADEL sessions for", userEmail);

    // Revoke all ZITADEL sessions for this user (browser + OAuth)
    const result = await revokeAllUserSessions(userEmail);

    const responseMessage = result.bulkTerminated
      ? `Bulk terminate successful for ${userEmail}`
      : `${result.deleted} session(s) deleted, ${result.failed} failed`;

    console.log(`[SLO API] ✅ SLO complete: ${responseMessage}`);

    // Clear the SLO cookie
    return new Response(
      JSON.stringify({
        success: true,
        email: userEmail,
        sessionsDeleted: result.deleted,
        sessionsFailed: result.failed,
        bulkTerminated: result.bulkTerminated,
        message: responseMessage,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": clearSLOCookie(),
        },
      }
    );
  } catch (error) {
    console.error("[SLO API] Error during SLO", error);

    return new Response(
      JSON.stringify({
        error: "SLO failed",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": clearSLOCookie(),
        },
      }
    );
  }
};

export const prerender = false;
