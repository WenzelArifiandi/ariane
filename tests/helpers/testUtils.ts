import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";

// Custom render function for React components with common providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    // Add any global providers here (theme, context, etc.)
    ...options,
  });
}

// Mock fetch for API testing
export function mockFetch(
  response: any,
  options: { status?: number; ok?: boolean } = {}
) {
  const mockResponse = {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => response,
    text: async () => JSON.stringify(response),
  };

  global.fetch = vi.fn().mockResolvedValue(mockResponse);
  return global.fetch;
}

// Create mock request/response objects for Astro testing
export function createMockRequest(
  url: string = "http://localhost:4321",
  options: RequestInit = {}
): Request {
  return new Request(url, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    ...options,
  });
}

export function createMockResponse(body?: any, init?: ResponseInit): Response {
  return new Response(body ? JSON.stringify(body) : undefined, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });
}

// Helper to create mock environment variables
export function mockEnv(vars: Record<string, string>) {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...vars };
  });

  afterEach(() => {
    process.env = originalEnv;
  });
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock Astro.locals for middleware testing
export function createMockLocals(overrides: Record<string, any> = {}) {
  return {
    user: null,
    session: null,
    isAuthenticated: false,
    authMode: "public",
    ...overrides,
  };
}
