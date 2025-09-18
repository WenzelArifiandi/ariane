import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server } from "@tests/setup/msw";

// Example integration test for API endpoints
describe("API Integration Tests", () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());

  describe("Authentication API", () => {
    it("should handle session creation", async () => {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "test-user-id",
          email: "test@example.com",
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should handle session destruction", async () => {
      const response = await fetch("/api/auth/session", {
        method: "DELETE",
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should validate Cloudflare Access JWT", async () => {
      const response = await fetch("/api/auth/cf-access/validate", {
        headers: {
          "CF-Access-Jwt-Assertion": "mock-jwt-token",
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.groups).toContain("developers");
    });
  });

  describe("GitHub OAuth Integration", () => {
    it("should redirect to GitHub for authorization", async () => {
      const response = await fetch("/api/oauth/github/start", {
        redirect: "manual",
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("github.com");
    });

    it("should handle OAuth callback", async () => {
      const response = await fetch(
        "/api/oauth/github/callback?code=test-code&state=test-state",
        {
          redirect: "manual",
        }
      );
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(["/", "http://localhost:4321/"]).toContain(location);
    });
  });

  describe("Health and Diagnostics", () => {
    it("should return health status", async () => {
      const response = await fetch("/api/health");

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.timestamp).toBeDefined();
    });

    it("should return diagnostic information", async () => {
      const response = await fetch("/api/diag");

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.environment).toBe("test");
      expect(data.auth_mode).toBe("public");
      expect(data.sanity_configured).toBe(true);
    });
  });

  describe("Sanity CMS Integration", () => {
    it("should handle Sanity queries", async () => {
      const response = await fetch(
        'https://tz1p3961.api.sanity.io/v2021-10-21/data/query/test?query=*[_type == "project"]'
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.query).toBe('*[_type == "project"]');
      expect(Array.isArray(data.result)).toBe(true);
    });
  });
});
