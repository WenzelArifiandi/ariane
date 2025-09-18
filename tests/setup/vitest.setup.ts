import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
// Type helpers for Node-ish globals in Vitest context
declare const process: any;
declare const global: any;
// Ensure Node 'crypto' mock exposes both named and default exports when mocked
vi.mock("crypto", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    default: actual,
  };
});
import { server } from "./msw";

// Start MSW server before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-secret-key-for-testing-only";
process.env.AUTH_MODE = "public";
process.env.PUBLIC_SANITY_PROJECT_ID = "test-project";
process.env.PUBLIC_SANITY_DATASET = "test";

// Mock global objects
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};
