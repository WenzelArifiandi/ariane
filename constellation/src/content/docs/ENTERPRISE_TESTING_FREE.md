---
title: "# 🛡️ Enterprise-Grade Quality & Security Pipeline (Zero Cost Stack)"
slug: enterprise_testing_free
description: "## 🛡️ Enterprise-Grade Quality & Security Pipeline (Zero Cost Stack)"
---



## 🛡️ Enterprise-Grade Quality & Security Pipeline (Zero Cost Stack)

Goal: Reach a “large-company / regulated-industry” assurance level using ONLY free / OSS tooling + GitHub native features. Everything here is additive to what you already have (CodeQL, Trivy, Lighthouse, audits, branch protection, security autofix).

---

## 1. Layered Assurance Model

| Layer                       | Objective                        | Free / OSS Tooling                                  | Status (Current Repo)                |
| --------------------------- | -------------------------------- | --------------------------------------------------- | ------------------------------------ |
| Source Hygiene              | Style, types, dead code          | ESLint, TypeScript, Prettier, knip (unused)         | ESLint/TS present; add knip optional |
| Unit / Logic                | Fast correctness                 | Vitest (already)                                    | ✅ (baseline)                        |
| Integration / Contract      | Internal boundary fidelity       | Vitest + MSW, superfetch/undici                     | ✅ (API mocks present)               |
| End‑to‑End / UX             | Critical flows, regressions      | Playwright                                          | ✅ (config present)                  |
| Performance / Accessibility | User experience budgets          | Lighthouse CI                                       | ✅ (config present)                  |
| SAST                        | Code vulnerability patterns      | CodeQL, Semgrep (OSS rules)                         | CodeQL ✅ / Semgrep ❌               |
| SCA / Dependencies          | Vulnerable / malicious deps      | Dependabot, npm audit, osv-scanner                  | npm audit ✅ / osv-scanner ❌        |
| Secrets Exposure            | Prevent credential leaks         | GitHub secret scanning (public), gitleaks           | Basic (grep) → upgrade to gitleaks   |
| Container / Image           | CVEs in images / base layers     | Trivy (already)                                     | ✅                                   |
| SBOM / Supply Chain         | Transparent dependency inventory | Syft (SBOM), CycloneDX (JS), Dependency Review      | Partial (n/a)                        |
| License / Compliance        | Policy conformance               | licensee, scan SBOM SPDX                            | ❌                                   |
| DAST (Baseline)             | Runtime surface baseline         | OWASP ZAP Baseline action                           | ❌                                   |
| IaC / Config                | Misconfig / drift risk           | Checkov / tfsec / kube-score (if used)              | N/A currently                        |
| Policy as Code              | Enforce quality gates            | OPA / Conftest (policies on SBOM, coverage)         | ❌                                   |
| Mutation Testing            | Test suite strength              | StrykerJS (selective critical modules)              | ❌ (optional)                        |
| Fuzzing (Targeted)          | Input robustness / parser safety | jazzer.js (if parsing), fast-check (property-based) | ❌                                   |
| Provenance / Integrity      | Build attestation                | GitHub Dependency Review + artifact checksums       | Partial                              |
| Flake Management            | CI stability                     | Retry strategy + JUnit reports + test-level timing  | Partial                              |

---

## 2. Target Maturity Phases

### Phase A – Foundation (High ROI, Low Complexity)

1. Enable SBOM generation (Syft + CycloneDX) – attach as artifact
2. Add gitleaks secrets scan (fail on HIGH after allowlist)
3. Add Semgrep OSS rules (informational fail → warn first 7 days)
4. osv-scanner for dependency vulns beyond npm advisory DB
5. ZAP Baseline scan against ephemeral dev server (non-blocking initially)
6. Coverage quality gate (e.g., global >= 70%, critical dirs >= 80%)

### Phase B – Hardening

7. Policy-as-code (Conftest) to enforce: min coverage, no GPL licenses, max CVSS threshold
8. License compliance from SBOM (fail on disallowed license list)
9. Mutation testing (Stryker) on auth/session modules weekly (separate workflow)
10. Property-based tests (fast-check) for critical pure functions (signing / cookie parsing)
11. Parallel matrix for Node LTS + current to surface runtime drift

### Phase C – Advanced / Continuous Assurance

12. Build provenance: publish SHA256 checksums + optional SLSA generator (when needed)
13. Flake tracker: parse test timing → flag > p95 duration increases
14. Risk scoring job combining: open vulns (SCA), secrets incidents, coverage deltas, mutation score → single badge / comment
15. Scheduled deep Semgrep + SAST variant job (weekly, more rules)
16. Fuzzing harness (if parsers / structured decoding added later)

---

## 3. Reference Architecture (Pipeline Shape)

```
name: ci-enterprise

trigger: PR + main

Jobs (fast first < 8m):
	1. prepare (restore caches, generate SBOM early) [<2m]
	2. lint+type (ESLint / TS) [parallel]
	3. unit (Vitest) → coverage upload
	4. integration (Vitest+MSW)
	5. e2e-smoke (Playwright single browser) PR only; full matrix on main

Security Lane (starts after prepare; in parallel):
	A. codeql (existing)
	B. semgrep (informational → gating later)
	C. dependencies (npm audit + osv-scanner)
	D. secrets (gitleaks)
	E. container (Trivy) – existing
	F. sbom (Syft + CycloneDX) + license filtering via Conftest

DAST Lane:
	- spin ephemeral server (Astro) → ZAP Baseline (non-blocking) → artifact HTML report

Policy Gate Aggregator:
	- Collect JSON outputs from: coverage, semgrep, osv, trivy, gitleaks, license scan
	- Evaluate OPA policies; fail build if hardened phase active
```

---

## 4. Tooling Inventory (All Free)

| Capability          | Tool                                 | Action (Pin SHA)            | Output Format         |
| ------------------- | ------------------------------------ | --------------------------- | --------------------- |
| SBOM (multi-format) | Syft                                 | anchore/syft-action         | SPDX / CycloneDX JSON |
| Dependency Vulns    | osv-scanner                          | aquasecurity/osv-scanner    | JSON SARIF (convert)  |
| Secrets             | gitleaks                             | gitleaks/gitleaks-action    | SARIF + JSON          |
| Semgrep SAST        | Semgrep OSS                          | returntocorp/semgrep-action | SARIF                 |
| DAST                | OWASP ZAP Baseline                   | zaproxy/action-baseline     | HTML + JSON           |
| Policy-as-Code      | Conftest (OPA)                       | instrumented via run step   | Exit codes            |
| License Audit       | licensee (for vendored) + SBOM parse | ruby gem / node script      | JSON summary          |
| Mutation Testing    | StrykerJS                            | manual npm script           | HTML + JSON           |
| Property Testing    | fast-check                           | dev dependency              | Via vitest            |
| Fuzzing (opt)       | jazzer.js / OSS-Fuzz (if later)      | manual integration          | Logs                  |

NOTE: Always pin actions to commit SHAs (as done in existing workflows) to prevent supply-chain drift.

---

## 5. Coverage & Quality Gates (Example Targets)

| Metric                        | Gate (Phase A)                | Gate (Phase B) | Gate (Phase C)  |
| ----------------------------- | ----------------------------- | -------------- | --------------- |
| Global Line Coverage          | ≥ 70%                         | ≥ 80%          | ≥ 85%           |
| Critical Auth Logic           | ≥ 80%                         | ≥ 90%          | ≥ 95%           |
| Mutation Score (auth)         | n/a                           | ≥ 55%          | ≥ 70%           |
| Open High Vulns (SCA)         | Allow (warn)                  | 0 blocking     | 0 blocking      |
| Secrets Findings              | 0 (false positives allowlist) | 0              | 0               |
| ZAP Baseline Alerts (Medium+) | Inform                        | <= 2 (warn)    | 0 blocking      |
| Semgrep High (true pos)       | Inform                        | 0 blocking     | 0 blocking      |
| License Violations            | Inform                        | 0 GPL/AGPL     | 0 non-whitelist |

---

## 6. Suggested OPA Policy Snippets (Conceptual)

```
package ci.policy

deny[msg] {
	input.coverage.global < 0.70
	msg := sprintf("Insufficient coverage: %.2f%%", [input.coverage.global*100])
}

deny[msg] {
	count(input.sca.high) > 0
	msg := "High severity dependency vulnerabilities present"
}

deny[msg] {
	some v in input.secrets.findings
	v.severity == "HIGH"
	msg := "High severity secret exposure detected"
}
```

All scanners emit JSON → aggregator consolidates → `opa eval -I` → pass/fail.

---

## 7. Performance / Cost Optimizations

1. Reuse caches (npm, Playwright browsers) keyed on lockfiles
2. Split fast lane (<10m) vs deep lane (runs on schedule)
3. Convert rarely changing scans (e.g., mutation) to weekly
4. Only run full Playwright matrix on `main` or nightly; PRs get smoke subset
5. Use `concurrency: { group: pr-number, cancel-in-progress: true }` to avoid queue storms

---

## 8. Risk Score (Optional Future)

Composite = weighted( vulns, secrets, coverage delta, mutation score, DAST alerts ). Produces badge `risk: low/medium/high`.

---

## 9. Prioritized Backlog (Actionable)

| Order | Task                                         | Effort | Phase |
| ----- | -------------------------------------------- | ------ | ----- |
| 1     | Add Syft SBOM job + artifact                 | S      | A     |
| 2     | Add gitleaks workflow (PR + push)            | S      | A     |
| 3     | Add Semgrep OSS job (non-blocking)           | S      | A     |
| 4     | Add osv-scanner step to dependency audit     | S      | A     |
| 5     | Add ZAP Baseline (scheduled + PR)            | M      | A     |
| 6     | Add coverage JSON → aggregator script        | M      | A     |
| 7     | Introduce Conftest with two starter policies | M      | B     |
| 8     | License filtering (SPDX from SBOM)           | M      | B     |
| 9     | Mutation testing (auth) weekly               | M      | B     |
| 10    | Risk badge generation                        | M      | C     |
| 11    | Fuzz/property tests for new parsers          | L      | C     |

---

## 10. Security Hardening Reminders

- Continue pinning all actions by commit SHA (already followed)
- Use `permissions: read-all` then elevate per job
- Protect main with required status checks (aggregated gate job)
- Optionally enforce signed commits / provenance later

---

## 11. Minimal Aggregator Script (Pseudo)

```bash
#!/usr/bin/env bash
set -euo pipefail

jq -n \
	--slurpfile cover coverage/coverage-summary.json \
	--slurpfile semgrep semgrep.json \
	--slurpfile osv osv.json \
	--slurpfile gitleaks gitleaks.json \
	--slurpfile trivy trivy.json \
	'{coverage:{global: ($cover[0].total.lines.pct/100)}, semgrep:$semgrep[0], osv:$osv[0], secrets:$gitleaks[0], container:$trivy[0]}' > aggregate.json

opa eval --fail-defined -I -d policy/ -i aggregate.json 'data.ci.policy'
```

---

## 12. When to Stop Adding More

You reach diminishing returns once: high-risk code is covered & mutated; zero critical vulns; no secrets incidents; SBOM + license stable; DAST baseline clean. Focus then shifts to runtime observability + SLO based quality signals.

---

## 13. Summary

This blueprint yields an enterprise-grade, defense-in-depth quality and security posture **without paid products**, leveraging GitHub + curated OSS scanners, with progressive enforcement to avoid developer friction.
