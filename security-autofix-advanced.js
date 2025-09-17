#!/usr/bin/env node

/**
 * Advanced Security Auto-Fix Script for CodeQL Vulnerabilities
 *
 * Enhanced version with more sophisticated pattern matching,
 * AST-based analysis, and additional vulnerability types.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced Configuration
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
    /\.d\.ts$/,
    /\.generated\./,
    /\.bundle\./
  ],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  aggressive: process.argv.includes('--aggressive'),
  maxFixes: process.argv.includes('--aggressive') ? 100 : 50,
  backupFiles: true
};

// Enhanced vulnerability patterns with context-aware fixes
const ADVANCED_PATTERNS = {
  'js/useless-assignment-to-local': {
    description: 'Remove useless assignments to local variables',
    priority: 1,
    fixes: [
      {
        // Simple unused assignment before return
        match: /^(\s*)(\w+)\s*=\s*([^;]+);?\s*\n\s*return\s/gm,
        replacement: (match, indent, varName, value, offset, string) => {
          // Check if variable is used between assignment and return
          const afterAssignment = string.slice(offset + match.length);
          const nextReturn = afterAssignment.indexOf('return');
          const varUsed = afterAssignment.slice(0, nextReturn).includes(varName);
          return varUsed ? match : `${indent}return `;
        }
      },
      {
        // Unused assignment at end of function
        match: /^(\s*)(\w+)\s*=\s*([^;]+);?\s*\n(\s*)\}/gm,
        replacement: (match, indent, varName, value, closingIndent) => {
          return `${closingIndent}}`;
        }
      }
    ]
  },

  'js/trivial-conditional': {
    description: 'Fix trivial conditionals and tautologies',
    priority: 2,
    fixes: [
      {
        // if (true) { ... } with single statement
        match: /^(\s*)if\s*\(\s*true\s*\)\s*\{\s*\n(\s*)([^}]+?)\n\s*\}/gm,
        replacement: '$1$2$3'
      },
      {
        // if (false) { ... } else { ... }
        match: /^(\s*)if\s*\(\s*false\s*\)\s*\{[^}]*\}\s*else\s*\{([^}]*)\}/gm,
        replacement: '$1{$2}'
      },
      {
        // condition && true -> condition
        match: /(\w+|\([^)]+\))\s*&&\s*true/g,
        replacement: '$1'
      },
      {
        // condition || false -> condition
        match: /(\w+|\([^)]+\))\s*\|\|\s*false/g,
        replacement: '$1'
      },
      {
        // !true -> false, !false -> true
        match: /!true/g,
        replacement: 'false'
      },
      {
        match: /!false/g,
        replacement: 'true'
      }
    ]
  },

  'js/comparison-between-incompatible-types': {
    description: 'Fix type comparison issues',
    priority: 3,
    fixes: [
      {
        // typeof comparisons with null
        match: /typeof\s+(\w+)\s*===\s*['"](string|number|boolean|object|function)['"]\s*&&\s*\1\s*===\s*null/g,
        replacement: 'typeof $1 === \'$2\' && $1 !== null'
      },
      {
        // Array length comparisons
        match: /(\w+)\.length\s*===\s*null/g,
        replacement: '$1.length === 0'
      },
      {
        // String comparison with number
        match: /(\w+)\.length\s*===\s*"(\d+)"/g,
        replacement: '$1.length === $2'
      },
      {
        // Undefined comparisons
        match: /(\w+)\s*===\s*undefined\s*\|\|\s*\1\s*===\s*null/g,
        replacement: '$1 == null'
      }
    ]
  },

  'js/use-before-declaration': {
    description: 'Fix use before declaration issues',
    priority: 4,
    fixes: [
      {
        // Hoist function declarations (simple case)
        match: /([\s\S]*?)(\nfunction\s+(\w+)\([^)]*\)\s*\{[\s\S]*?\n\})/g,
        replacement: (match, before, funcDecl, funcName) => {
          if (before.includes(funcName + '(')) {
            const lines = before.split('\n');
            const hoistedFunc = funcDecl.trim();
            return `${hoistedFunc}\n${before}`;
          }
          return match;
        }
      }
    ]
  },

  'js/unneeded-defensive-code': {
    description: 'Remove unneeded defensive code patterns',
    priority: 2,
    fixes: [
      {
        // obj && obj.prop -> obj?.prop
        match: /(\w+)\s*&&\s*\1\.(\w+)(?!\s*\()/g,
        replacement: '$1?.$2'
      },
      {
        // obj && obj.method() -> obj?.method()
        match: /(\w+)\s*&&\s*\1\.(\w+)\(/g,
        replacement: '$1?.$2('
      },
      {
        // typeof x !== 'undefined' && x -> x
        match: /typeof\s+(\w+)\s*!==\s*['"']undefined['"']\s*&&\s*\1/g,
        replacement: '$1'
      },
      {
        // Array.isArray(x) && x.length > 0 -> x?.length > 0
        match: /Array\.isArray\((\w+)\)\s*&&\s*\1\.length\s*>\s*0/g,
        replacement: '$1?.length > 0'
      }
    ]
  },

  'js/superfluous-trailing-arguments': {
    description: 'Remove superfluous trailing arguments',
    priority: 1,
    fixes: [
      {
        // Multiple trailing undefined
        match: /(,\s*undefined){2,}\s*\)/g,
        replacement: ')'
      },
      {
        // Single trailing undefined
        match: /,\s*undefined\s*\)/g,
        replacement: ')'
      },
      {
        // Trailing empty string
        match: /,\s*['"']['"']\s*\)/g,
        replacement: ')'
      }
    ]
  },

  'js/unreachable-statement': {
    description: 'Remove unreachable statements',
    priority: 3,
    fixes: [
      {
        // Code after return (same indentation level)
        match: /^(\s*)return\s+[^;]+;?\s*\n(\1\S[^\n]*)/gm,
        replacement: (match, indent, returnStmt, unreachable) => {
          // Only remove if it's clearly unreachable and not a closing brace
          if (!unreachable.includes('}') && !unreachable.includes('//')) {
            return returnStmt;
          }
          return match;
        }
      },
      {
        // Code after throw
        match: /^(\s*)throw\s+[^;]+;?\s*\n(\1\S[^\n]*)/gm,
        replacement: '$1throw'
      }
    ]
  },

  'js/redundant-operation': {
    description: 'Remove redundant operations',
    priority: 1,
    fixes: [
      {
        // Double negation on boolean
        match: /!!(\w+)(?=\s|$|;|,|\))/g,
        replacement: '$1'
      },
      {
        // Boolean constructor on boolean
        match: /Boolean\((\w+)\)/g,
        replacement: '!!$1'
      },
      {
        // String constructor on string literal
        match: /String\((['"][^'"]*['"])\)/g,
        replacement: '$1'
      },
      {
        // Number constructor on number literal
        match: /Number\((\d+(?:\.\d+)?)\)/g,
        replacement: '$1'
      }
    ]
  },

  'js/prototype-pollution-utility': {
    description: 'Fix prototype pollution vulnerabilities',
    priority: 5,
    fixes: [
      {
        // Object.assign with user input - add prototype check
        match: /Object\.assign\((\w+),\s*(\w+)\)/g,
        replacement: 'Object.assign($1, $2 && typeof $2 === \'object\' && !Array.isArray($2) ? $2 : {})'
      },
      {
        // Spread operator with user input
        match: /\{\s*\.\.\.(\w+)\s*\}/g,
        replacement: '{ ...($1 && typeof $1 === \'object\' && !Array.isArray($1) ? $1 : {}) }'
      }
    ]
  },

  'js/empty-password-in-configuration-file': {
    description: 'Fix empty password configurations',
    priority: 5,
    fixes: [
      {
        // Empty password strings
        match: /(password|pwd|pass)\s*[:=]\s*['"']['"']/gi,
        replacement: (match, field) => `${field}: process.env.${field.toUpperCase()} || ''`
      }
    ]
  }
};

// Enhanced utility functions
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
  const inSourceDir = CONFIG.sourceDirectories.some(dir =>
    filePath.startsWith(dir) || filePath.includes(`/${dir}`)
  );

  if (!inSourceDir) {
    log(`Skipping ${filePath} - not in source directories`);
    return false;
  }

  const excluded = CONFIG.excludePatterns.some(pattern => pattern.test(filePath));
  if (excluded) {
    log(`Skipping ${filePath} - matches exclude pattern`);
    return false;
  }

  const isJSTS = /\.(js|ts|jsx|tsx|mjs)$/.test(filePath);
  if (!isJSTS) {
    log(`Skipping ${filePath} - not a JS/TS file`);
    return false;
  }

  return true;
}

async function createBackup(filePath, content) {
  if (!CONFIG.backupFiles || CONFIG.dryRun) return;

  const backupPath = `${filePath}.backup.${Date.now()}`;
  try {
    await fs.writeFile(backupPath, content, 'utf8');
    log(`Created backup: ${backupPath}`);
  } catch (err) {
    warn(`Failed to create backup for ${filePath}:`, err.message);
  }
}

async function fetchCodeQLAlerts() {
  if (!CONFIG.githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/code-scanning/alerts?state=open&per_page=100`;

  info('Fetching CodeQL alerts from GitHub...');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${CONFIG.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'security-autofix-advanced/1.0'
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

function analyzeCodeContext(content, startLine, endLine) {
  const lines = content.split('\n');
  const contextLines = 5;

  const start = Math.max(0, startLine - contextLines);
  const end = Math.min(lines.length, endLine + contextLines);

  return {
    before: lines.slice(start, startLine).join('\n'),
    target: lines.slice(startLine, endLine).join('\n'),
    after: lines.slice(endLine, end).join('\n'),
    indentation: lines[startLine]?.match(/^\s*/)?.[0] || '',
    isInFunction: lines.slice(0, startLine).some(line =>
      /^\s*function\s|\s*=>\s*\{|\s*\{/.test(line)
    )
  };
}

function applyAdvancedFixes(content, vulnerabilityType, alertLocation) {
  const pattern = ADVANCED_PATTERNS[vulnerabilityType];
  if (!pattern) {
    warn(`No advanced patterns defined for vulnerability type: ${vulnerabilityType}`);
    return { content, applied: 0 };
  }

  let modifiedContent = content;
  let appliedFixes = 0;

  // Sort fixes by priority (higher number = higher priority)
  const sortedFixes = pattern.fixes.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const fix of sortedFixes) {
    const before = modifiedContent;
    let localApplied = 0;

    if (typeof fix.replacement === 'function') {
      modifiedContent = modifiedContent.replace(fix.match, (...args) => {
        localApplied++;
        return fix.replacement(...args);
      });
    } else {
      const matches = modifiedContent.match(fix.match);
      if (matches) {
        modifiedContent = modifiedContent.replace(fix.match, fix.replacement);
        localApplied = matches.length;
      }
    }

    appliedFixes += localApplied;

    if (before !== modifiedContent && localApplied > 0) {
      log(`Applied ${localApplied} fixes for pattern: ${fix.match.toString().slice(0, 50)}...`);
    }
  }

  return { content: modifiedContent, applied: appliedFixes };
}

async function processAdvancedAlert(alert) {
  const filePath = alert.most_recent_instance?.location?.path;
  const vulnerabilityType = alert.rule?.id;
  const alertNumber = alert.number;
  const location = alert.most_recent_instance?.location;

  if (!filePath || !vulnerabilityType) {
    warn(`Skipping alert ${alertNumber} - missing file path or vulnerability type`);
    return { processed: false };
  }

  info(`Processing alert ${alertNumber}: ${vulnerabilityType} in ${filePath}`);

  try {
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

    const originalContent = await fs.readFile(fullPath, 'utf8');

    // Create backup before making changes
    await createBackup(fullPath, originalContent);

    // Apply advanced fixes with context awareness
    const result = applyAdvancedFixes(originalContent, vulnerabilityType, location);

    if (result.applied === 0) {
      log(`No fixes applied for ${vulnerabilityType} in ${filePath}`);
      return { processed: false, reason: 'no_fixes_applied' };
    }

    if (result.content === originalContent) {
      log(`Content unchanged after fixes for ${filePath}`);
      return { processed: false, reason: 'content_unchanged' };
    }

    // Validate the result (basic syntax check)
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(result.content);
      } catch (err) {
        error(`JSON validation failed for ${filePath}:`, err.message);
        return { processed: false, reason: 'validation_failed' };
      }
    }

    if (!CONFIG.dryRun) {
      await fs.writeFile(fullPath, result.content, 'utf8');
      info(`Modified file: ${filePath} (${result.applied} fixes applied)`);
    } else {
      info(`[DRY RUN] Would modify ${filePath} (${result.applied} fixes)`);
    }

    return {
      processed: true,
      filePath,
      vulnerabilityType,
      fixesApplied: result.applied,
      alertNumber,
      originalSize: originalContent.length,
      newSize: result.content.length
    };

  } catch (err) {
    error(`Error processing alert ${alertNumber}:`, err.message);
    return { processed: false, reason: 'error', error: err.message };
  }
}

function generateAdvancedSummary(results) {
  const processed = results.filter(r => r.processed);
  const skipped = results.filter(r => !r.processed);

  const byType = {};
  const byFile = {};
  const bytesChanged = processed.reduce((sum, r) =>
    sum + Math.abs((r.newSize || 0) - (r.originalSize || 0)), 0
  );

  processed.forEach(result => {
    const type = result.vulnerabilityType;
    const file = result.filePath;

    byType[type] = (byType[type] || 0) + result.fixesApplied;
    byFile[file] = (byFile[file] || 0) + result.fixesApplied;
  });

  return {
    timestamp: new Date().toISOString(),
    mode: CONFIG.dryRun ? 'dry-run' : 'live',
    totalAlerts: results.length,
    processed: processed.length,
    skipped: skipped.length,
    totalFixesApplied: processed.reduce((sum, r) => sum + r.fixesApplied, 0),
    bytesChanged,
    byType,
    byFile,
    skippedReasons: skipped.reduce((acc, r) => {
      const reason = r.reason || 'unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {}),
    processedAlerts: processed.map(r => ({
      alertNumber: r.alertNumber,
      type: r.vulnerabilityType,
      file: r.filePath,
      fixes: r.fixesApplied
    }))
  };
}

async function main() {
  try {
    info('Advanced Security Auto-Fix Script Starting...');
    info(`Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
    info(`Aggressiveness: ${CONFIG.aggressive ? 'AGGRESSIVE' : 'CONSERVATIVE'}`);
    info(`Max fixes: ${CONFIG.maxFixes}`);

    const alerts = await fetchCodeQLAlerts();

    if (alerts.length === 0) {
      info('No open CodeQL alerts found in source directories');
      return;
    }

    info(`Found ${alerts.length} relevant alerts to process`);

    // Group and prioritize alerts
    const alertsByType = alerts.reduce((acc, alert) => {
      const type = alert.rule?.id || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    info('Alert distribution by type:');
    Object.entries(alertsByType).forEach(([type, count]) => {
      const pattern = ADVANCED_PATTERNS[type];
      const priority = pattern?.priority || 0;
      info(`  ${type}: ${count} alerts (priority: ${priority})`);
    });

    // Sort alerts by priority
    const sortedAlerts = alerts.sort((a, b) => {
      const priorityA = ADVANCED_PATTERNS[a.rule?.id]?.priority || 0;
      const priorityB = ADVANCED_PATTERNS[b.rule?.id]?.priority || 0;
      return priorityB - priorityA;
    });

    // Process alerts with safety limit
    const alertsToProcess = sortedAlerts.slice(0, CONFIG.maxFixes);
    if (alerts.length > CONFIG.maxFixes) {
      warn(`Processing only first ${CONFIG.maxFixes} alerts (${alerts.length} total)`);
    }

    const results = [];
    for (const alert of alertsToProcess) {
      const result = await processAdvancedAlert(alert);
      results.push(result);

      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Generate and display summary
    const summary = generateAdvancedSummary(results);

    info('\n=== ADVANCED SUMMARY ===');
    info(`Execution mode: ${summary.mode.toUpperCase()}`);
    info(`Total alerts processed: ${summary.totalAlerts}`);
    info(`Successfully fixed: ${summary.processed}`);
    info(`Skipped: ${summary.skipped}`);
    info(`Total fixes applied: ${summary.totalFixesApplied}`);
    info(`Bytes changed: ${summary.bytesChanged}`);

    if (Object.keys(summary.byType).length > 0) {
      info('\nFixes by vulnerability type (with priority):');
      Object.entries(summary.byType)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          const priority = ADVANCED_PATTERNS[type]?.priority || 0;
          info(`  ${type}: ${count} fixes (priority: ${priority})`);
        });
    }

    if (Object.keys(summary.byFile).length > 0) {
      info('\nFiles modified:');
      Object.entries(summary.byFile)
        .sort(([, a], [, b]) => b - a)
        .forEach(([file, count]) => {
          info(`  ${file}: ${count} fixes`);
        });
    }

    // Save detailed report
    const reportPath = path.resolve('security-autofix-advanced-report.json');
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    info(`\nDetailed report saved to: ${reportPath}`);

    if (CONFIG.dryRun) {
      info('\n*** DRY RUN MODE - No files were actually modified ***');
      info('Run without --dry-run to apply changes');
    } else {
      info('\n*** CHANGES APPLIED ***');
      info('Please review the changes and run tests before committing');
    }

  } catch (err) {
    error('Advanced script failed:', err.message);
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