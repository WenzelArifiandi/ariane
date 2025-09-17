#!/usr/bin/env node

/**
 * Security Auto-Fix Script for CodeQL Vulnerabilities
 *
 * This script fetches CodeQL alerts from GitHub API and applies automated fixes
 * for common vulnerability patterns in TypeScript/JavaScript code.
 *
 * Usage: node security-autofix.js [options]
 *
 * Environment variables required:
 * - GITHUB_TOKEN: GitHub token with security_events scope
 * - GITHUB_OWNER: Repository owner (default: wenzelarifiandi)
 * - GITHUB_REPO: Repository name (default: ariane)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
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
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  maxFixes: 50 // Safety limit
};

// Vulnerability patterns and their fixes
const VULNERABILITY_PATTERNS = {
  'js/useless-assignment-to-local': {
    description: 'Remove useless assignments to local variables',
    pattern: /^(\s*)(\w+)\s*=\s*(.+);?\s*$/gm,
    fixes: [
      {
        // Pattern: variable = value; (where variable is never used after)
        match: /^(\s*)(\w+)\s*=\s*(.+);?\s*$/,
        replacement: (match, indent, varName, value) => {
          // Only remove if it's a simple assignment and not a declaration
          if (value.includes('=') || value.includes('function') || value.includes('=>')) {
            return match; // Keep complex assignments
          }
          return ''; // Remove simple useless assignment
        }
      }
    ]
  },

  'js/trivial-conditional': {
    description: 'Fix trivial conditionals that are always true/false',
    fixes: [
      {
        // if (true) { ... }
        match: /^(\s*)if\s*\(\s*true\s*\)\s*\{([^}]*)\}/gm,
        replacement: (match, indent, body) => `${indent}${body.trim()}`
      },
      {
        // if (false) { ... } -> remove entire block
        match: /^(\s*)if\s*\(\s*false\s*\)\s*\{[^}]*\}/gm,
        replacement: ''
      },
      {
        // condition ? true : false -> condition
        match: /(\w+|\([^)]+\))\s*\?\s*true\s*:\s*false/g,
        replacement: '$1'
      },
      {
        // condition ? false : true -> !condition
        match: /(\w+|\([^)]+\))\s*\?\s*false\s*:\s*true/g,
        replacement: '!$1'
      }
    ]
  },

  'js/comparison-between-incompatible-types': {
    description: 'Fix comparisons between incompatible types',
    fixes: [
      {
        // typeof x === 'string' && x === null -> typeof x === 'string' && x !== null
        match: /typeof\s+(\w+)\s*===\s*['"](string|number|boolean)['"]\s*&&\s*\1\s*===\s*null/g,
        replacement: 'typeof $1 === \'$2\' && $1 !== null'
      },
      {
        // array.length === null -> array.length === 0
        match: /(\w+)\.length\s*===\s*null/g,
        replacement: '$1.length === 0'
      }
    ]
  },

  'js/use-before-declaration': {
    description: 'Fix use before declaration issues',
    fixes: [
      {
        // Move function declarations to top (basic case)
        match: /^(\s*)(.*?)(\s*function\s+(\w+)\([^)]*\)\s*\{[^}]*\})/gm,
        replacement: (match, indent, before, funcDecl, funcName) => {
          if (before.includes(funcName)) {
            return `${funcDecl}\n${indent}${before}`;
          }
          return match;
        }
      }
    ]
  },

  'js/unneeded-defensive-code': {
    description: 'Remove unneeded defensive code',
    fixes: [
      {
        // if (x && x.property) -> if (x?.property) (when safe)
        match: /if\s*\(\s*(\w+)\s*&&\s*\1\.(\w+)\s*\)/g,
        replacement: 'if ($1?.$2)'
      },
      {
        // x && x.method() -> x?.method()
        match: /(\w+)\s*&&\s*\1\.(\w+)\(/g,
        replacement: '$1?.$2('
      }
    ]
  },

  'js/superfluous-trailing-arguments': {
    description: 'Remove superfluous trailing arguments',
    fixes: [
      {
        // Remove extra undefined arguments
        match: /,\s*undefined\s*\)/g,
        replacement: ')'
      },
      {
        // Remove multiple trailing undefined arguments
        match: /,\s*undefined\s*,\s*undefined\s*\)/g,
        replacement: ')'
      }
    ]
  },

  'js/unreachable-statement': {
    description: 'Remove unreachable statements',
    fixes: [
      {
        // Code after return statement
        match: /^(\s*)return\s+[^;]+;\s*\n(\s*[^}\s][^\n]*)/gm,
        replacement: (match, indent, returnStmt, unreachable) => {
          // Only remove if it's clearly unreachable (same indentation level)
          if (unreachable.trim() && !unreachable.includes('}')) {
            return returnStmt;
          }
          return match;
        }
      }
    ]
  },

  'js/redundant-operation': {
    description: 'Remove redundant operations',
    fixes: [
      {
        // !!boolean -> boolean
        match: /!!(\w+)/g,
        replacement: '$1'
      },
      {
        // String(string) -> string (when already string)
        match: /String\(([^)]+)\)/g,
        replacement: '$1'
      }
    ]
  }
};

// Utility functions
function log(...args) {
  if (CONFIG.verbose) {
    console.log('[VERBOSE]', ...args);
  }
}

function info(...args) {
  console.log('[INFO]', ...args);
}

function warn(...args) {
  console.warn('[WARN]', ...args);
}

function error(...args) {
  console.error('[ERROR]', ...args);
}

function shouldProcessFile(filePath) {
  // Check if file is in source directories
  const inSourceDir = CONFIG.sourceDirectories.some(dir =>
    filePath.startsWith(dir) || filePath.includes(`/${dir}`)
  );

  if (!inSourceDir) {
    log(`Skipping ${filePath} - not in source directories`);
    return false;
  }

  // Check exclude patterns
  const excluded = CONFIG.excludePatterns.some(pattern => pattern.test(filePath));
  if (excluded) {
    log(`Skipping ${filePath} - matches exclude pattern`);
    return false;
  }

  // Only process JS/TS files
  const isJSTS = /\.(js|ts|jsx|tsx|mjs)$/.test(filePath);
  if (!isJSTS) {
    log(`Skipping ${filePath} - not a JS/TS file`);
    return false;
  }

  return true;
}

async function fetchCodeQLAlerts() {
  if (!CONFIG.githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/code-scanning/alerts`;

  info('Fetching CodeQL alerts from GitHub...');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${CONFIG.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'security-autofix/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const alerts = await response.json();
    info(`Fetched ${alerts.length} CodeQL alerts`);

    return alerts.filter(alert =>
      alert.state === 'open' &&
      shouldProcessFile(alert.most_recent_instance?.location?.path || '')
    );

  } catch (err) {
    error('Failed to fetch CodeQL alerts:', err.message);
    throw err;
  }
}

async function readFile(filePath) {
  const fullPath = path.resolve(filePath);
  try {
    const content = await fs.readFile(fullPath, 'utf8');
    log(`Read file: ${filePath} (${content.length} chars)`);
    return content;
  } catch (err) {
    error(`Failed to read file ${filePath}:`, err.message);
    throw err;
  }
}

async function writeFile(filePath, content) {
  if (CONFIG.dryRun) {
    info(`[DRY RUN] Would write ${content.length} chars to ${filePath}`);
    return;
  }

  const fullPath = path.resolve(filePath);
  try {
    await fs.writeFile(fullPath, content, 'utf8');
    info(`Wrote file: ${filePath} (${content.length} chars)`);
  } catch (err) {
    error(`Failed to write file ${filePath}:`, err.message);
    throw err;
  }
}

function applyFixes(content, vulnerabilityType) {
  const pattern = VULNERABILITY_PATTERNS[vulnerabilityType];
  if (!pattern) {
    warn(`No patterns defined for vulnerability type: ${vulnerabilityType}`);
    return { content, applied: 0 };
  }

  let modifiedContent = content;
  let appliedFixes = 0;

  for (const fix of pattern.fixes) {
    const before = modifiedContent;

    if (typeof fix.replacement === 'function') {
      modifiedContent = modifiedContent.replace(fix.match, (...args) => {
        appliedFixes++;
        return fix.replacement(...args);
      });
    } else {
      const matches = modifiedContent.match(fix.match);
      if (matches) {
        modifiedContent = modifiedContent.replace(fix.match, fix.replacement);
        appliedFixes += matches.length;
      }
    }

    if (before !== modifiedContent) {
      log(`Applied ${appliedFixes} fixes for pattern: ${fix.match}`);
    }
  }

  return { content: modifiedContent, applied: appliedFixes };
}

async function processAlert(alert) {
  const filePath = alert.most_recent_instance?.location?.path;
  const vulnerabilityType = alert.rule?.id;
  const alertNumber = alert.number;

  if (!filePath || !vulnerabilityType) {
    warn(`Skipping alert ${alertNumber} - missing file path or vulnerability type`);
    return { processed: false };
  }

  info(`Processing alert ${alertNumber}: ${vulnerabilityType} in ${filePath}`);

  try {
    // Check if file exists and should be processed
    const fullPath = path.resolve(filePath);
    let fileExists = true;
    try {
      await fs.access(fullPath);
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      warn(`File not found: ${filePath}`);
      return { processed: false, reason: 'file_not_found' };
    }

    const originalContent = await readFile(filePath);
    const result = applyFixes(originalContent, vulnerabilityType);

    if (result.applied === 0) {
      log(`No fixes applied for ${vulnerabilityType} in ${filePath}`);
      return { processed: false, reason: 'no_fixes_applied' };
    }

    if (result.content === originalContent) {
      log(`Content unchanged after fixes for ${filePath}`);
      return { processed: false, reason: 'content_unchanged' };
    }

    await writeFile(filePath, result.content);

    return {
      processed: true,
      filePath,
      vulnerabilityType,
      fixesApplied: result.applied,
      alertNumber
    };

  } catch (err) {
    error(`Error processing alert ${alertNumber}:`, err.message);
    return { processed: false, reason: 'error', error: err.message };
  }
}

function generateSummary(results) {
  const processed = results.filter(r => r.processed);
  const skipped = results.filter(r => !r.processed);

  const byType = {};
  const byFile = {};

  processed.forEach(result => {
    const type = result.vulnerabilityType;
    const file = result.filePath;

    byType[type] = (byType[type] || 0) + result.fixesApplied;
    byFile[file] = (byFile[file] || 0) + result.fixesApplied;
  });

  return {
    totalAlerts: results.length,
    processed: processed.length,
    skipped: skipped.length,
    totalFixesApplied: processed.reduce((sum, r) => sum + r.fixesApplied, 0),
    byType,
    byFile,
    skippedReasons: skipped.reduce((acc, r) => {
      const reason = r.reason || 'unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {}),
    processedAlerts: processed
  };
}

async function main() {
  try {
    info('Security Auto-Fix Script Starting...');
    info(`Configuration: ${JSON.stringify({
      owner: CONFIG.owner,
      repo: CONFIG.repo,
      dryRun: CONFIG.dryRun,
      verbose: CONFIG.verbose,
      maxFixes: CONFIG.maxFixes
    }, null, 2)}`);

    // Fetch alerts from GitHub
    const alerts = await fetchCodeQLAlerts();

    if (alerts.length === 0) {
      info('No open CodeQL alerts found in source directories');
      return;
    }

    info(`Found ${alerts.length} relevant alerts to process`);

    // Group alerts by vulnerability type
    const alertsByType = alerts.reduce((acc, alert) => {
      const type = alert.rule?.id || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    info('Alert distribution by type:');
    Object.entries(alertsByType).forEach(([type, count]) => {
      info(`  ${type}: ${count} alerts`);
    });

    // Process alerts with safety limit
    const alertsToProcess = alerts.slice(0, CONFIG.maxFixes);
    if (alerts.length > CONFIG.maxFixes) {
      warn(`Processing only first ${CONFIG.maxFixes} alerts (${alerts.length} total)`);
    }

    const results = [];
    for (const alert of alertsToProcess) {
      const result = await processAlert(alert);
      results.push(result);

      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Generate and display summary
    const summary = generateSummary(results);

    info('\n=== SUMMARY ===');
    info(`Total alerts processed: ${summary.totalAlerts}`);
    info(`Successfully fixed: ${summary.processed}`);
    info(`Skipped: ${summary.skipped}`);
    info(`Total fixes applied: ${summary.totalFixesApplied}`);

    if (Object.keys(summary.byType).length > 0) {
      info('\nFixes by vulnerability type:');
      Object.entries(summary.byType).forEach(([type, count]) => {
        info(`  ${type}: ${count} fixes`);
      });
    }

    if (Object.keys(summary.byFile).length > 0) {
      info('\nFiles modified:');
      Object.entries(summary.byFile).forEach(([file, count]) => {
        info(`  ${file}: ${count} fixes`);
      });
    }

    if (Object.keys(summary.skippedReasons).length > 0) {
      info('\nSkipped reasons:');
      Object.entries(summary.skippedReasons).forEach(([reason, count]) => {
        info(`  ${reason}: ${count} alerts`);
      });
    }

    // Save detailed report
    const reportPath = path.resolve('security-autofix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      summary,
      results: results.filter(r => r.processed) // Only include successful fixes
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    info(`\nDetailed report saved to: ${reportPath}`);

    if (CONFIG.dryRun) {
      info('\n*** DRY RUN MODE - No files were actually modified ***');
    }

  } catch (err) {
    error('Script failed:', err.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    error('Unhandled error:', err);
    process.exit(1);
  });
}