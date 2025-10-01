// API endpoint to check Cloudflare Access authentication status
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    // Check if the user has valid Cloudflare Access authentication
    // by hitting the auth subdomain's get-identity endpoint
    const response = await fetch(
      "https://auth.wenzelarifiandi.com/cdn-cgi/access/get-identity",
      {
        headers: {
          // Forward any CF Access cookies if they exist
          // Note: This won't work cross-domain, so we'll use a different approach
        },
      }
    );

    if (response.ok) {
      const identity = await response.json();
      return new Response(
        JSON.stringify({
          authenticated: true,
          user: {
            email: identity.email,
            name: identity.name,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ authenticated: false }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ authenticated: false, error: String(error) }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
