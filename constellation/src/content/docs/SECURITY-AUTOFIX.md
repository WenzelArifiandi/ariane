---
title: "Security Auto-Fix Script"
description: "# Security Auto-Fix Script"
slug: "security-autofix"
---



# Security Auto-Fix Script

This script automatically fetches CodeQL security alerts from GitHub and applies safe, conservative fixes to resolve common vulnerability patterns in TypeScript/JavaScript code.

## Features

- **GitHub Integration**: Fetches open CodeQL alerts via GitHub API
- **Source Code Focus**: Only processes files in `site/src/`, `studio/`, and `.github/` directories
- **Safe Operation**: Conservative fixes with dry-run mode and safety limits
- **Comprehensive Reporting**: Detailed fix reports and summaries
- **Multiple Vulnerability Types**: Handles 8+ common CodeQL vulnerability patterns

## Supported Vulnerability Types

### 1. `js/useless-assignment-to-local`
Removes assignments to variables that are never used afterward:
```javascript
// Before
let temp = someValue;
return otherValue;

// After
return otherValue;
```

### 2. `js/trivial-conditional`
Fixes conditionals that are always true or false:
```javascript
// Before
if (true) { doSomething(); }
condition ? true : false

// After
doSomething();
condition
```

### 3. `js/comparison-between-incompatible-types`
Fixes type comparison issues:
```javascript
// Before
typeof x === 'string' && x === null
array.length === null

// After
typeof x === 'string' && x !== null
array.length === 0
```

### 4. `js/use-before-declaration`
Moves function declarations before their usage:
```javascript
// Before
callFunction();
function callFunction() { ... }

// After
function callFunction() { ... }
callFunction();
```

### 5. `js/unneeded-defensive-code`
Simplifies unnecessary defensive patterns using optional chaining:
```javascript
// Before
if (obj && obj.property) { ... }
obj && obj.method()

// After
if (obj?.property) { ... }
obj?.method()
```

### 6. `js/superfluous-trailing-arguments`
Removes unnecessary trailing arguments:
```javascript
// Before
someFunction(arg1, arg2, undefined)

// After
someFunction(arg1, arg2)
```

### 7. `js/unreachable-statement`
Removes code that can never be executed:
```javascript
// Before
return value;
console.log("Never reached");

// After
return value;
```

### 8. `js/redundant-operation`
Simplifies redundant operations:
```javascript
// Before
!!boolean
String(stringValue)

// After
boolean
stringValue
```

## Setup

### Prerequisites
- Node.js 22.x
- GitHub token with `security_events` scope

### Environment Variables
```bash
# Required
export GITHUB_TOKEN="your_github_token_here"

# Optional (defaults shown)
export GITHUB_OWNER="wenzelarifiandi"
export GITHUB_REPO="ariane"
```

### GitHub Token Setup
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a new token with the `security_events` scope
3. Copy the token and set it as `GITHUB_TOKEN` environment variable

## Usage

### Quick Start
```bash
# Install dependencies (if any)
npm install

# Dry run (recommended first)
npm run security:autofix:dry-run

# Apply fixes
npm run security:autofix

# Verbose output
npm run security:autofix:verbose
```

### Direct Script Usage
```bash
# Basic usage
node scripts/security-autofix.js

# With options
node scripts/security-autofix.js --dry-run --verbose
```

### Command Line Options
- `--dry-run`: Preview changes without modifying files
- `--verbose`: Show detailed logging information

## Configuration

The script can be configured by editing the `CONFIG` object in `scripts/security-autofix.js`:

```javascript
const CONFIG = {
  githubToken: process.env.GITHUB_TOKEN,
  owner: process.env.GITHUB_OWNER || 'wenzelarifiandi',
  repo: process.env.GITHUB_REPO || 'ariane',
  sourceDirectories: ['site/src/', 'studio/', '.github/'],
  excludePatterns: [
    /\/dist\//,
    /\/node_modules\//,
    /\/vendor\//,
    /\.min\.js$/,
    /\.d\.ts$/
  ],
  maxFixes: 50 // Safety limit
};
```

## Safety Features

### File Filtering
- Only processes files in specified source directories
- Excludes build artifacts, dependencies, and minified files
- Only processes `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs` files

### Conservative Fixes
- Only applies patterns we're highly confident about
- Preserves complex logic and edge cases
- Maintains code formatting and structure

### Safety Limits
- Maximum of 50 fixes per run (configurable)
- Dry-run mode for testing
- Detailed logging and reporting

### Error Handling
- Graceful failure on individual files
- Comprehensive error reporting
- No changes applied if any errors occur

## Output and Reporting

### Console Output
```
[INFO] Security Auto-Fix Script Starting...
[INFO] Fetched 25 CodeQL alerts
[INFO] Found 15 relevant alerts to process
[INFO] Processing alert 123: js/trivial-conditional in site/src/middleware.ts
[INFO] Applied 3 fixes for pattern: /if\s*\(\s*true\s*\)/

=== SUMMARY ===
Total alerts processed: 15
Successfully fixed: 12
Skipped: 3
Total fixes applied: 28

Fixes by vulnerability type:
  js/trivial-conditional: 8 fixes
  js/useless-assignment-to-local: 5 fixes
  js/unneeded-defensive-code: 15 fixes

Files modified:
  site/src/middleware.ts: 12 fixes
  studio/schemas/project.ts: 16 fixes
```

### Report File
A detailed JSON report is saved to `security-autofix-report.json`:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "config": { ... },
  "summary": {
    "totalAlerts": 15,
    "processed": 12,
    "skipped": 3,
    "totalFixesApplied": 28,
    "byType": { ... },
    "byFile": { ... }
  },
  "results": [ ... ]
}
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Security Auto-Fix

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  security-autofix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Run Security Auto-Fix
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npm run security:autofix:dry-run
          npm run security:autofix

      - name: Create Pull Request
        if: success()
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: '🛡️ Security auto-fix: resolve CodeQL alerts'
          title: 'Security Auto-Fix: CodeQL Vulnerability Fixes'
          body: |
            Automated security fixes applied by the security auto-fix script.

            See `security-autofix-report.json` for detailed changes.
```

## Troubleshooting

### Common Issues

#### 1. "GITHUB_TOKEN environment variable is required"
**Solution**: Set up your GitHub token as described in the setup section.

#### 2. "GitHub API request failed: 403"
**Solution**: Ensure your GitHub token has the `security_events` scope.

#### 3. "No open CodeQL alerts found"
**Solution**: This is normal if all alerts are resolved or in excluded directories.

#### 4. "File not found" errors
**Solution**: The script only processes files that exist in your working directory.

### Debugging

Use verbose mode to see detailed operation logs:
```bash
npm run security:autofix:verbose
```

Check the generated report file for detailed information about what was processed.

## Limitations

- Only processes files in specified source directories
- Conservative approach may miss some edge cases
- Does not handle all possible vulnerability patterns
- Requires manual review of changes before committing

## Contributing

To add support for new vulnerability patterns:

1. Add the pattern to `VULNERABILITY_PATTERNS` in `scripts/security-autofix.js`
2. Define the regex patterns and replacement logic
3. Test thoroughly with `--dry-run` mode
4. Update this documentation

## License

This script is part of the Ariane project and follows the same license terms.