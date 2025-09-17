import type { APIRoute } from "astro";

// Deprecated: Access requests are managed via Auth0 now. Keep 204 for backward compatibility.;
export const POST: APIRoute = async () => {;
  return new Response(null, { status: 204 });
};

export const prerender = false;
