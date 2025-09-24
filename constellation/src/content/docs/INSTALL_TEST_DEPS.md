---
title: "Testing Dependencies"
description: "# Testing Dependencies"
slug: install_test_deps
---

# Testing Dependencies

Install the following packages to resolve TypeScript errors and enable testing:

```bash
# Core testing framework
npm install -D vitest @vitest/ui @vitest/coverage-v8

# DOM testing utilities
npm install -D jsdom @testing-library/dom @testing-library/jest-dom

# React testing (if needed for components)
npm install -D @testing-library/react react react-dom

# End-to-end testing
npm install -D @playwright/test

# HTTP mocking
npm install -D msw

# Node.js types
npm install -D @types/node

# TypeScript utilities
npm install -D typescript
```

## Alternative Quick Install

Run all dependencies at once:

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8 jsdom @testing-library/dom @testing-library/jest-dom @testing-library/react react react-dom @playwright/test msw @types/node typescript
```

After installing dependencies:

1. Initialize Playwright: `npx playwright install`
2. Run unit tests: `npm run test:unit`
3. Run integration tests: `npm run test:integration`
4. Run E2E tests: `npm run test:e2e`
5. Run all tests: `npm run test:all`
6. View coverage: `npm run test:coverage`
7. Open test UI: `npm run test:ui`

## Current Test Structure

- **Unit Tests**: `tests/unit/` - Test individual functions and components
- **Integration Tests**: `tests/integration/` - Test API endpoints and service integration
- **E2E Tests**: `tests/e2e/` - Test full user workflows with Playwright
- **Fixtures**: `tests/fixtures/` - Mock data and test fixtures
- **Helpers**: `tests/helpers/` - Shared test utilities and mocks
- **Setup**: `tests/setup/` - Global test configuration and MSW setup

The testing infrastructure is now ready for immediate use once dependencies are installed!
