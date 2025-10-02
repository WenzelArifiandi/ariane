import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  // Hard-pinned logout URL at root path
  const logoutUrl = "https://wenzelarifiandi.com/cdn-cgi/access/logout?return_to=https%3A%2F%2Fwenzelarifiandi.com%2F";

  // Log the request for debugging
  console.log("[/signout] Request received from:", request.headers.get("referer"));
  console.log("[/signout] Redirecting to:", logoutUrl);

  return new Response(null, {
    status: 302,
    headers: { Location: logoutUrl },
  });
};

export const prerender = false;
