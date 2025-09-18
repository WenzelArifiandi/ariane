#!/usr/bin/env node

/**
 * Test script for security auto-fix functionality
 *
 * This script creates test files with known vulnerability patterns
 * and validates that the auto-fix scripts can detect and fix them correctly.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const TEST_DIR = './test-autofix';

// Test cases with vulnerable code and expected fixes
const TEST_CASES = {
  'useless-assignment.js': {
    vulnerable: `function test() {
  let temp = getValue();
  return "success";
}

function another() {
  const result = calculateValue();
  console.log("done");
}`,
    expected: `function test() {
  return "success";
}

function another() {
  console.log("done");
}`
  },

  'trivial-conditional.js': {
    vulnerable: `function example() {
  if (true) {
    console.log("always runs");
  }

  if (false) {
    console.log("never runs");
  }

  const result = condition ? true : false;
  return result;
}`,
    expected: `function example() {
  console.log("always runs");

  const result = condition;
  return result;
}`
  },

  'comparison-types.js': {
    vulnerable: `function checkTypes(value) {
  if (typeof value === 'string' && value === null) {
    return false;
  }

  if (array.length === null) {
    return true;
  }

  return false;
}`,
    expected: `function checkTypes(value) {
  if (typeof value === 'string' && value !== null) {
    return false;
  }

  if (array.length === 0) {
    return true;
  }

  return false;
}`
  },

  'defensive-code.js': {
    vulnerable: `function process(obj) {
  if (obj && obj.property) {
    console.log(obj.property);
  }

  if (obj && obj.method()) {
    return true;
  }

  return false;
}`,
    expected: `function process(obj) {
  if (obj?.property) {
    console.log(obj?.property);
  }

  if (obj?.method()) {
    return true;
  }

  return false;
}`
  },

  'redundant-operations.js': {
    vulnerable: `function redundant() {
  const bool = !!true;
  const str = String("hello");
  const num = Number(42);

  return bool;
}`,
    expected: `function redundant() {
  const bool = true;
  const str = "hello";
  const num = 42;

  return bool;
}`
  }
};

async function setupTestEnvironment() {
  console.log('Setting up test environment...');

  // Create test directory
  try {
    await fs.mkdir(TEST_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  // Create test files with vulnerable code
  for (const [filename, testCase] of Object.entries(TEST_CASES)) {
    const filePath = path.join(TEST_DIR, filename);
    await fs.writeFile(filePath, testCase.vulnerable, 'utf8');
    console.log(`Created test file: ${filePath}`);
  }
}

async function runAutoFix() {
  console.log('\\nRunning auto-fix script...');

  try {
    // Mock the GitHub API by creating a simple test mode
    const env = {
      ...process.env,
      GITHUB_TOKEN: 'test-token',
      TEST_MODE: 'true'
    };

    // Run the basic auto-fix script in test mode
    const output = execSync('node scripts/security-autofix.js --dry-run --verbose', {
      cwd: process.cwd(),
      env,
      encoding: 'utf8'
    });

    console.log('Auto-fix output:');
    console.log(output);

  } catch (err) {
    console.error('Auto-fix script failed:', err.message);
    return false;
  }

  return true;
}

async function validateFixes() {
  console.log('\\nValidating fixes...');

  let allPassed = true;

  for (const [filename, testCase] of Object.entries(TEST_CASES)) {
    const filePath = path.join(TEST_DIR, filename);

    try {
      const actualContent = await fs.readFile(filePath, 'utf8');
      const expectedContent = testCase.expected.trim();
      const actualTrimmed = actualContent.trim();

      if (actualTrimmed === expectedContent) {
        console.log(`✅ ${filename}: Fix applied correctly`);
      } else {
        console.log(`❌ ${filename}: Fix not applied correctly`);
        console.log('Expected:');
        console.log(expectedContent);
        console.log('\\nActual:');
        console.log(actualTrimmed);
        allPassed = false;
      }
    } catch (err) {
      console.error(`❌ ${filename}: Error reading file:`, err.message);
      allPassed = false;
    }
  }

  return allPassed;
}

async function cleanup() {
  console.log('\\nCleaning up test environment...');

  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    console.log('Test directory removed');
  } catch (err) {
    console.warn('Warning: Could not remove test directory:', err.message);
  }
}

async function runTests() {
  console.log('🧪 Security Auto-Fix Test Suite\\n');

  let success = false;

  try {
    await setupTestEnvironment();
    const fixRan = await runAutoFix();

    if (fixRan) {
      const allFixed = await validateFixes();
      success = allFixed;
    }

  } catch (err) {
    console.error('Test suite failed:', err.message);
  } finally {
    await cleanup();
  }

  console.log('\\n' + '='.repeat(50));
  if (success) {
    console.log('✅ All tests passed! Security auto-fix is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the auto-fix implementation.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(err => {
    console.error('Unhandled test error:', err);
    process.exit(1);
  });
}