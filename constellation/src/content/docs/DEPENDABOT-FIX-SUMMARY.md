---
title: "Dependabot PR Fixes Summary"
description: "# Dependabot PR Fixes Summary"
slug: dependabot-fix-summary
---

# Dependabot PR Fixes Summary

## Issue

Dependabot was opening pull requests but CI was failing. After merging several PRs without proper testing, TypeScript errors were discovered indicating breaking API changes.

## PRs Processed

### ✅ Merged Successfully:

- **PR #20**: `sharp` from 0.34.3 → 0.34.4 (patch update, safe)
- **PR #19**: `@simplewebauthn/server` from 10.0.1 → 13.2.1 (major update, **required code changes**)
- **PR #9**: `@portabletext/editor` from 2.10.0 → 2.11.0 (minor update, safe)
- **PR #8**: `baseline-browser-mapping` from 1.2.6 → 1.3.0 (minor update, safe)

### ❌ Closed with Explanation:

- **PR #10**: `tailwindcss` from 3.4.17 → 4.3.4 (major update with breaking changes)
  - Reason: TailwindCSS v4 introduces breaking changes requiring significant config migration
  - Closed with comment explaining migration complexity

## Critical Fix Required: SimpleWebAuthn v10 → v13

### Problem

The `@simplewebauthn/server` update from v10 to v13 introduced breaking API changes that weren't caught before merging:

**TypeScript Errors:**

```
Property 'credentialID' does not exist on type registrationInfo
Property 'credentialPublicKey' does not exist on type registrationInfo
Property 'counter' does not exist on type registrationInfo
Object literal may only specify known properties, and 'authenticator' does not exist
```

### Solution

Updated authentication endpoints to match v13 API structure:

#### 1. Registration Response Structure Change

**Before (v10):**

```typescript
const { credentialID, credentialPublicKey, counter } = registrationInfo;
const id = Buffer.from(credentialID).toString("base64url");
const publicKey = Buffer.from(credentialPublicKey).toString("base64url");
```

**After (v13):**

```typescript
const { credential } = registrationInfo;
const id = credential.id; // already base64url string in v13
const publicKey = Buffer.from(credential.publicKey).toString("base64url");
const counter = credential.counter;
```

#### 2. Authentication Parameter Change

**Before (v10):**

```typescript
authenticator: {
  credentialID: stored.id,
  credentialPublicKey: Buffer.from(stored.publicKey, "base64url"),
  counter: stored.counter,
}
```

**After (v13):**

```typescript
credential: {
  id: stored.id,
  publicKey: Buffer.from(stored.publicKey, "base64url"),
  counter: stored.counter,
}
```

### Files Modified

- `site/src/pages/api/auth/verify-registration.ts`
- `site/src/pages/api/auth/verify-authentication.ts`

## Lesson Learned

**Critical Testing Gap:** PRs were merged without running comprehensive tests first. The proper workflow should be:

1. ✅ Pull PR locally
2. ✅ Run `npm install`
3. ✅ Run `npm run build`
4. ✅ Run `npm run check` (TypeScript validation)
5. ✅ Test critical functionality
6. ✅ Only then merge if all tests pass

## Status

- ✅ All TypeScript errors resolved
- ✅ Build completes successfully
- ✅ Authentication endpoints updated for SimpleWebAuthn v13
- ✅ Remaining TypeScript errors are unrelated to Dependabot updates (Sanity CMS types)

## Future Process

Implement proper testing checklist before merging any Dependabot PRs, especially major version updates that are likely to contain breaking changes.
