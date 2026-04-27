# Handover Notes - SWADE Fantasy World Kit

Date: 2026-04-27

## Current Status
The baseline module workflow has been expanded and is working with two key improvements:

1. Required modules are locked in the Baseline Modules UI.
2. A global baseline profile workflow exists for easier setup across worlds.

## What Was Implemented

### Required Module Locking
- Required dependencies are detected from this module's manifest relationships.
- Required module entries are always included in saved baseline data.
- Required module checkboxes are checked and disabled in the selector UI.
- Bulk actions preserve required modules:
  - Select Active Modules keeps required modules selected.
  - Clear Selection clears optional modules only.
- Apply Baseline also enforces required modules.

### Cross-World Baseline Workflow
- Added a client-scoped global profile setting: globalBaselineModules.
- Added selector actions:
  - Load Global Profile
  - Save Selection as Global
  - Apply Global to This World
- Apply Global to This World replaces the current world's baseline list with the global profile, then applies it.

## Files Touched Recently
- scripts/main.js
- templates/baseline-modules.hbs

## Suggested Commit Message
feat: add global baseline profiles and lock required baseline modules

- enforce required module IDs across baseline save/apply flows
- disable required module toggles in baseline selector UI
- add client-scoped global baseline profile setting
- add load/save/apply global baseline actions for faster world setup

## Quick Resume Checklist
1. Open Foundry as GM in an existing world.
2. Open Baseline Modules manager and verify:
   - required modules show as disabled + selected
   - Select Active Modules and Clear Selection preserve required modules
3. Save a custom selection as global.
4. Open a different world and verify:
   - Load Global Profile updates the checkboxes
   - Apply Global to This World enables installed modules from that profile
5. Confirm notifications and final module states look correct.

## Optional Next Improvement
- Add a small UI indicator for global profile metadata (count and last-saved timestamp) so it is clear what profile is currently stored.
