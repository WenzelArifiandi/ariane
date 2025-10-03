// ZITADEL Service Account API client
// Docs: https://zitadel.com/docs/guides/integrate/zitadel-apis/access-zitadel-apis
//
// Required service-user permissions (in ZITADEL Console):
// - Organization Owner role (or custom role with user.read and session.delete)
// - Credentials: CIPHER_CLIENT_ID and CIPHER_CLIENT_SECRET (set in Vercel environment)

const ZITADEL_ISSUER = "https://cipher.wenzelarifiandi.com";
const ZITADEL_API_SCOPE = "urn:zitadel:iam:org:project:id:zitadel:aud";

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get ZITADEL service account access token using client credentials flow
 */
async function getServiceAccountToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId =
    import.meta.env.CIPHER_CLIENT_ID ||
    process.env.CIPHER_CLIENT_ID;
  const clientSecret =
    import.meta.env.CIPHER_CLIENT_SECRET ||
    process.env.CIPHER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "ZITADEL service account credentials not configured (CIPHER_CLIENT_ID, CIPHER_CLIENT_SECRET)"
    );
  }

  const tokenUrl = `${ZITADEL_ISSUER}/oauth/v2/token`;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: `openid profile email ${ZITADEL_API_SCOPE}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get ZITADEL service token: ${error}`);
  }

  const data = await response.json();

  // Cache token (expires_in is in seconds)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
  };

  return data.access_token;
}

/**
 * Search for user by email
 * API: POST /v2/users
 */
export async function searchUserByEmail(
  email: string
): Promise<{ userId: string; email: string } | null> {
  const token = await getServiceAccountToken();

  const response = await fetch(`${ZITADEL_ISSUER}/v2/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queries: [
        {
          emailQuery: {
            emailAddress: email,
            method: "TEXT_QUERY_METHOD_EQUALS",
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[ZITADEL] User search failed", response.status, error);
    return null;
  }

  const data = await response.json();

  if (!data.result || data.result.length === 0) {
    console.log("[ZITADEL] No user found for email", email);
    return null;
  }

  const user = data.result[0];
  return {
    userId: user.userId,
    email:
      user.human?.email?.email || user.machine?.name || email,
  };
}

/**
 * List sessions for a user
 * API: POST /v2/sessions/search
 */
export async function listUserSessions(
  userId: string
): Promise<Array<{ sessionId: string; userId: string }>> {
  const token = await getServiceAccountToken();

  const response = await fetch(`${ZITADEL_ISSUER}/v2/sessions/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queries: [
        {
          userIdQuery: {
            userId: userId,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[ZITADEL] Session search failed", response.status, error);
    return [];
  }

  const data = await response.json();

  if (!data.result || data.result.length === 0) {
    return [];
  }

  return data.result.map((session: any) => ({
    sessionId: session.id,
    userId: session.factors?.user?.id || userId,
  }));
}

/**
 * Delete a session
 * API: DELETE /v2/sessions/:sessionId
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const token = await getServiceAccountToken();

  const response = await fetch(`${ZITADEL_ISSUER}/v2/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[ZITADEL] Failed to delete session ${sessionId}`, error);
    return false;
  }

  return true;
}

/**
 * Revoke all sessions for a user (by email)
 */
export async function revokeAllUserSessions(
  email: string
): Promise<{ deleted: number; failed: number }> {
  console.log("[ZITADEL SLO] Starting session revocation for", email);

  // 1. Find user by email
  const user = await searchUserByEmail(email);
  if (!user) {
    console.warn("[ZITADEL SLO] ⚠️ User not found for email:", email);
    return { deleted: 0, failed: 0 };
  }

  console.log("[ZITADEL SLO] ✅ Found user:", { userId: user.userId, email: user.email });

  // 2. List all sessions for user
  const sessions = await listUserSessions(user.userId);
  console.log(`[ZITADEL SLO] 📋 Found ${sessions.length} active session(s) for user ${user.userId}`);

  if (sessions.length === 0) {
    console.log("[ZITADEL SLO] No active sessions to revoke");
    return { deleted: 0, failed: 0 };
  }

  // 3. Delete each session
  let deleted = 0;
  let failed = 0;

  for (const session of sessions) {
    console.log(`[ZITADEL SLO] 🗑️ Deleting session ${session.sessionId}...`);
    const success = await deleteSession(session.sessionId);
    if (success) {
      deleted++;
      console.log(`[ZITADEL SLO] ✅ Successfully deleted session ${session.sessionId}`);
    } else {
      failed++;
      console.error(`[ZITADEL SLO] ❌ Failed to delete session ${session.sessionId}`);
    }
  }

  console.log(`[ZITADEL SLO] 🎯 Session revocation complete: ${deleted} deleted, ${failed} failed`);

  return { deleted, failed };
}
