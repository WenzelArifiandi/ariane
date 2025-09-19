## ⚙️ Bazel Adoption Evaluation for Ariane Monorepo

Date: 2025-09-17

### 1. Current Stack Snapshot

| Domain        | Tech                              | Build Mode                  | Notes                                            |
| ------------- | --------------------------------- | --------------------------- | ------------------------------------------------ |
| Web App       | Astro (site/)                     | Vite/Astro incremental      | SSR + serverless (Vercel)                        |
| CMS           | Sanity Studio (studio/)           | Sanity CLI bundler          | Deploy via webhook                               |
| Auth Infra    | Zitadel (docker-compose)          | Docker images / remote host | Shell + YAML orchestration                       |
| WASM          | Rust → wasm (wasm/session-signer) | `wasm-pack`                 | Outputs into `site/src/lib/wasm/session-signer/` |
| Scripts / Ops | Bash                              | Direct execution            | Deployment, status, security scans               |
| Testing       | Vitest, Playwright                | Node-based                  | Already parallelizable                           |
| Security      | CodeQL / Trivy / audits           | GitHub Actions              | YAML-managed                                     |

### 2. What Bazel Would Bring

| Value                           | Benefit                                                         | Applicability Here                                                                   |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Deterministic / Hermetic Builds | Reproducible outputs, fewer “works on my machine” issues        | Medium (JS toolchains are evolving; reproducibility improves with pinned toolchains) |
| Fine-Grained Caching            | Avoids rebuilding unaffected targets (esp. CI)                  | High once monorepo grows (currently modest)                                          |
| Remote Cache / Build Farm Ready | Scale with contributors / heavier Rust or future Go/ML services | Future potential                                                                     |
| Unified Build Graph             | Rust, TypeScript, Docker, tests in one DAG                      | Good alignment (cross-language)                                                      |
| Test Impact Analysis            | Only re-run impacted tests                                      | Useful once > few hundred tests                                                      |
| Consistent Tool Versions        | Toolchain pinning via rules_js / rules_rust                     | Moderate value (pnpm / corepack alt)                                                 |
| Incremental Migration Possible  | Directory-by-directory                                          | Feasible                                                                             |

### 3. Costs / Trade-Offs

| Category               | Cost                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Initial Cognitive Load | Bazel concepts (WORKSPACE, BUILD targets, visibility, toolchains)                                            |
| Rules Maturity         | JS ecosystem: migration from deprecated `rules_nodejs` to `rules_js` / `bazelbuild/rules_ts` still evolving  |
| Local DX               | Astro + Sanity dev servers expect ad-hoc watch; Bazel integration means wrappers or leave them outside Bazel |
| Caching ROI            | Current repo size small; potential over-engineering now                                                      |
| Onboarding             | Contributors must learn Bazel to modify build graph                                                          |
| Workflow Duplication   | GitHub Actions YAML still required; Bazel adds a layer, not replaces CI logic                                |

### 4. Alternatives (Lower Friction)

| Alternative                     | Strength                                         | Weakness vs Bazel                           |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| Nx / Turborepo                  | Simple task graph, caching, remote cache options | Less hermetic; limited cross-language depth |
| Moonrepo                        | Language-agnostic, good task runner              | Smaller ecosystem than Bazel                |
| Just + Make + task graph        | Minimal overhead                                 | No deep dependency graph awareness          |
| GitHub Actions Caching Strategy | Low complexity                                   | Manual invalidation logic                   |

### 5. When Bazel Makes Sense (Trigger Conditions)

Adopt once ≥2 of these become true:

1. WASM / Rust modules expand (e.g., multiple crates / shared libs)
2. Additional backend service(s) (e.g., gateway, API server) added
3. Test suite runtime > 8–10 minutes without caching
4. Frequent partial rebuild needs during PR iteration
5. Need reproducible SBOM / provenance chain for builds (supply chain compliance)

### 6. Recommended Adoption Strategy (Phased)

| Phase                       | Scope                                                                      | Goals                                   | Exit Criteria                                           |
| --------------------------- | -------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| 0 – Evaluate                | Dry-run sandbox branch                                                     | Validate rules_js + rules_rust synergy  | All POC targets build + test                            |
| 1 – WASM Core               | `wasm/session-signer` only                                                 | Hermetic Rust → wasm artifact + hashing | Bazel build matches current wasm-pack output            |
| 2 – Test Orchestration      | Introduce Bazel test targets wrapping Vitest (select dirs)                 | Run subset tests via Bazel caching      | Passing selective test runs                             |
| 3 – Site Build Wrapper      | Wrap `astro build` as Bazel `sh_binary` / `genrule` (non-hermetic)         | Cache static build artifacts            | Build output reproducible & cache hit on no code change |
| 4 – Multi-Lang Graph        | Add license scan, SBOM, security scan as Bazel `test` or `sh_test` targets | Unified pipeline view                   | CI executes Bazel for majority of quality gates         |
| 5 – Remote Cache (Optional) | Configure GCS/S3 cache                                                     | Reduce cold build time on CI            | >50% cache hit on repeated PRs                          |

### 7. Minimal POC Layout (Illustrative Only)

```
WORKSPACE.bazel
  ├─ rules_js, rules_rust, rules_python (if ever), platforms
  ├─ npm translation lock (via rules_js: pnpm / package.json import)
  └─ rust toolchain pinned

wasm/session-signer/BUILD.bazel
  rust_library(
    name = "signer_lib",
    srcs = ["src/lib.rs"],
    crate_features = ["wasm"],
  )

  # Custom rule or genrule to invoke wasm-bindgen/wasm-pack if needed:
  genrule(
    name = "signer_wasm",
    srcs = [":signer_lib"],
    outs = ["signer_bg.wasm", "signer.js"],
    cmd = "$(location //tools:wasm_pack) build --release --target web --out-dir $(RULEDIR) $(execpath :signer_lib)",
  )

tests/BUILD.bazel (later)
  nodejs_test(
    name = "unit_auth_tests",
    data = glob(["unit/**.test.ts"]),
    entry_point = "//tools:test_runner.js",
  )
```

> NOTE: `nodejs_test` semantics differ depending on chosen ruleset. With modern `rules_js`, you'd define `js_run_binary` + harness script.

### 8. Handling Astro & Sanity (Non-Hermetic)

Astro’s dev server + HMR: keep outside Bazel for local iteration; only wrap production `astro build` for caching & dependency graph inclusion. Same pattern for `sanity build`.

### 9. Tooling Rules Status (2025 Context)

| Area                    | Recommended Rule                                   | Comment                                                                                                                                    |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| JavaScript / TypeScript | `rules_js`                                         | Replacement trajectory for `rules_nodejs`; integrates package lock import                                                                  |
| Rust                    | `rules_rust`                                       | Mature; good for crate graphs                                                                                                              |
| Docker (optional)       | `rules_oci` / `rules_docker`                       | For deterministic image layering; could replace manual docker-compose build flows for custom services (Zitadel third-party—leave external) |
| WASM                    | Custom wrapper + `wasm-bindgen-cli`                | No first-class universal rule; simple genrule acceptable                                                                                   |
| OPA Policies            | `rules_opa` or shell `sh_test` invoking `opa eval` | Light integration                                                                                                                          |

### 10. CI Integration Pattern

1. `bazel fetch //...` (warm external repos)
2. `bazel build //wasm/... //site:astro_build` (selective subsets)
3. `bazel test //tests:unit_auth_tests --test_output=errors`
4. Fallback tasks (Lighthouse / Playwright) remain external until wrappers stable
5. Introduce `bazelrc` with common flags: `--remote_cache=...` (future), `--experimental_remote_downloader=...`, `--repository_cache=...`

### 11. Risks / Anti-Patterns

| Risk                 | Mitigation                                                          |
| -------------------- | ------------------------------------------------------------------- |
| Early Full Migration | Start with WASM only                                                |
| Complex Custom Rules | Prefer thin genrule wrappers first                                  |
| Developer Friction   | Provide `make` / npm script aliases e.g. `npm run build:wasm:bazel` |
| Unnecessary Wrapping | Don’t Bazel-ize ephemeral dev flows (tunnels, local HMR)            |

### 12. Success Metrics (If Adopted)

| Metric                 | Baseline        | Target After Phase 3           |
| ---------------------- | --------------- | ------------------------------ |
| Cold CI build time     | (Measure first) | -25%                           |
| Repeat PR build time   | (Measure)       | -40% with cache                |
| Selective test runtime | Full suite      | < 30% of full on small changes |
| Cache hit rate         | 0%              | > 60% after stable graph       |

### 13. Recommendation (Now vs Later)

Given current repository size and diversity, **immediate Bazel adoption is optional** and not critical to velocity. The **highest leverage near-term engineering investment** remains security/test breadth + automation gating (already being enhanced). Adopt Bazel _later_ when build graph complexity or test duration starts to materially impact cycle time.

### 14. If You Want to Explore Now (Low-Risk Steps)

1. Create `experimental/bazel/` branch
2. Add `WORKSPACE.bazel` + minimal `wasm/session-signer/BUILD.bazel`
3. Confirm `bazel build //wasm/session-signer:signer_wasm` reproduces wasm-pack output
4. Document steps in `BAZEL_ADOPTION_LOG.md`
5. Re-evaluate value after 2 weeks of trial

### 15. Quick POC Snippets (Not Yet Added to Repo)

```python
# WORKSPACE.bazel (excerpt)
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# rules_rust
http_archive(
    name = "rules_rust",
    urls = ["https://github.com/bazelbuild/rules_rust/releases/download/0.44.0/rules_rust-0.44.0.tar.gz"],
    sha256 = "<sha256_here>",
)
load("@rules_rust//rust:repositories.bzl", "rules_rust_dependencies")
rules_rust_dependencies()

# rules_js (example)
http_archive(
    name = "aspect_rules_js",
    urls = ["https://github.com/aspect-build/rules_js/releases/download/v2.0.0/rules_js-v2.0.0.tar.gz"],
    sha256 = "<sha256_here>",
)
```

```python
# wasm/session-signer/BUILD.bazel (simplified)
load("@rules_rust//rust:defs.bzl", "rust_library")

rust_library(
    name = "signer_lib",
    srcs = glob(["src/**/*.rs"]),
    edition = "2021",
)

genrule(
    name = "signer_wasm",
    srcs = [":signer_lib"],
    outs = ["signer_bg.wasm"],
    cmd = "wasm-pack build --release --target web --out-dir $(@D)/out . && cp $(@D)/out/*wasm $@",
    tools = ["@npm//:wasm-pack"],  # or system dependency first pass
)
```

### 16. Final Position

Adopt **incrementally and experimentally**; do **not** pause current testing/security roadmap for Bazel migration yet. Value can be re-assessed after codebase or team scale increases.

---

If you’d like, next step can be an _experimental branch scaffold_—just say the word and I can generate initial WORKSPACE + BUILD stubs (kept isolated).
