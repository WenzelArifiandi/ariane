// API endpoint to handle post-authentication redirect from Cipher
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url, redirect }) => {
  // Get the return URL from query parameters
  const returnTo = url.searchParams.get("return_to");

  // Validate the return URL to ensure it's from our domain
  let redirectUrl = "https://wenzelarifiandi.com";

  if (returnTo) {
    try {
      const returnUrl = new URL(decodeURIComponent(returnTo));
      // Only allow redirects to our own domain
      if (
        returnUrl.hostname === "wenzelarifiandi.com" ||
        returnUrl.hostname === "localhost"
      ) {
        // Add auth_success parameter to indicate successful authentication
        returnUrl.searchParams.set("auth_success", "true");
        redirectUrl = returnUrl.toString();
      }
    } catch (error) {
      console.warn("Invalid return_to URL:", returnTo);
      // Fall back to default redirect
    }
  } else {
    // No return URL specified, redirect to home with auth success indicator
    redirectUrl = "https://wenzelarifiandi.com?auth_success=true";
  }

  return redirect(redirectUrl, 302);
};

export const POST: APIRoute = async ({ request, redirect }) => {
  // Handle POST requests from Cloudflare Access callback
  const formData = await request.formData();
  const returnTo = formData.get("return_to") as string;

  let redirectUrl = "https://wenzelarifiandi.com?auth_success=true";

  if (returnTo) {
    try {
      const returnUrl = new URL(decodeURIComponent(returnTo));
      if (
        returnUrl.hostname === "wenzelarifiandi.com" ||
        returnUrl.hostname === "localhost"
      ) {
        returnUrl.searchParams.set("auth_success", "true");
        redirectUrl = returnUrl.toString();
      }
    } catch (error) {
      console.warn("Invalid return_to URL:", returnTo);
    }
  }

  return redirect(redirectUrl, 302);
};
