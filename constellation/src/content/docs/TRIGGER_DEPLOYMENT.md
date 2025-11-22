---
title: Manual Deployment Trigger
slug: trigger_deployment
description: "# Manual Deployment Trigger"
---



# Manual Deployment Trigger

Since the automatic deployment workflow isn't triggering, here are ways to run it manually:

## Option 1: GitHub UI (Recommended)

1. Go to: https://github.com/WenzelArifiandi/ariane/actions/workflows/deploy-zitadel.yml
2. Click the **"Run workflow"** dropdown button
3. Leave all fields as default (or set `force` to true to bypass all checks)
4. Click **"Run workflow"**

## Option 2: Test Current Enhanced Logic

The new deployment workflow will:

1. ✅ Detect git changes in zitadel/ directory (we have changes in commit 6cd2c61)
2. ✅ Check Oracle deployment state via SSH
3. ✅ Compare current commit (6cd2c61) against deployed commit on Oracle
4. ✅ Make intelligent deployment decision
5. ✅ Record successful deployment state on Oracle server

## Option 3: Check Workflow Status

You can also check if there are any pending workflows at:
https://github.com/WenzelArifiandi/ariane/actions

## Expected Behavior

The enhanced workflow should now:
- Show detailed deployment decision logic
- Check Oracle server state vs git state
- Deploy intelligently based on both factors
- Record deployment state for future comparisons

This solves the problem where failed deployments would block future deployments!