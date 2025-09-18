import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Mock handlers for API endpoints
export const handlers = [
  // Ensure callback path is matched (with or without querystring) and always 302
  http.get("/api/oauth/github/callback", () => {
    // Debug: indicate MSW callback handler was hit
    // eslint-disable-next-line no-console
    console.log("MSW: matched /api/oauth/github/callback (exact)");
    return HttpResponse.redirect("http://localhost:4321/", 302);
  }),
  http.get(/\/api\/oauth\/github\/callback.*/, () => {
    // Debug: indicate MSW callback regex handler was hit
    // eslint-disable-next-line no-console
    console.log("MSW: matched /api/oauth/github/callback (regex)");
    return HttpResponse.redirect("http://localhost:4321/", 302);
  }),
  // Auth endpoints
  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      isAuthenticated: false,
      user: null,
    });
  }),

  http.post("/api/auth/session", () => {
    return HttpResponse.json({
      success: true,
      message: "Session created",
    });
  }),

  http.delete("/api/auth/session", () => {
    return HttpResponse.json({
      success: true,
      message: "Session destroyed",
    });
  }),

  // GitHub OAuth start endpoint
  http.get("/api/oauth/github/start", () => {
    return HttpResponse.redirect("https://github.com/login/oauth/authorize");
  }),

  // Sanity API mocks
  http.get("https://tz1p3961.api.sanity.io/v2021-10-21/data/query/test", () => {
    return HttpResponse.json({
      query: '*[_type == "project"]',
      result: [],
    });
  }),

  // Cloudflare Access validation
  http.get("/api/auth/cf-access/validate", () => {
    return HttpResponse.json({
      valid: true,
      groups: ["developers"],
    });
  }),

  // Health check endpoints
  http.get("/api/health", () => {
    return HttpResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  }),

  // Diagnostic endpoint
  http.get("/api/diag", () => {
    return HttpResponse.json({
      environment: "test",
      auth_mode: "public",
      sanity_configured: true,
    });
  }),
];

// Create MSW server instance
export const server = setupServer(...handlers);
