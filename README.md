# SWADE Fantasy World Kit - Feature List and Roadmap

Last updated: 2026-04-27

## Product Direction
SWADE Fantasy World Kit provides curated SWADE fantasy compendiums, controlled player-facing visibility, and fast world setup tools for consistent module activation.

## Implemented Features

### Curated Compendium Visibility
- Curated mode limits player-facing compendium visibility.
- GM visibility override is supported.
- Extra-visible pack whitelist is supported via searchable selector.
- Compendium sidebar render is filtered by runtime permissions.

### Quick Insert Integration
- Quick Insert indexing restrictions are synchronized with curated pack visibility.
- PLAYER and TRUSTED roles are restricted from hidden packs.
- GAMEMASTER role is also restricted when GM pack visibility is configured to hide non-curated packs.

### Baseline Module Management
- Baseline Modules manager supports searchable module selection.
- **Only enables/disables already-installed modules; does not install new modules.**
- Apply Baseline enables installed modules from the configured baseline, then reloads the world.
- Required dependencies (from this module's manifest) are enforced and non-deactivatable in the selector UI.
- Dependency resolution runs on all save/apply operations:
  - Detects installed dependencies of selected modules that are not also selected.
  - Prompts the GM to include them automatically.
  - Uninstalled dependencies are silently skipped.
  - Covered paths: Save Selection (world baseline), Save Selection as Global, Apply Baseline to World, Apply Global to This World.
- Startup validation warns GMs (notification + console) if any active modules are missing installed dependencies.

### Cross-World Setup Workflow
- Global baseline profile is stored as a client-scoped setting.
- UI includes:
  - Load Global Profile
  - Save Selection as Global
  - Apply Global to This World

### Rename and Backward Compatibility
- Module renamed to SWADE Fantasy World Kit.
- Internal module ID changed to swade-fantasy-world-kit.
- One-time legacy settings migration from swade-consolidated-fantasy-compendiums is in place.

## Current State Checklist
- Required modules cannot be unchecked in baseline UI.
- Select Active Modules and Clear Selection preserve required modules.
- Global profile can be saved in one world and loaded/applied in another.
- Legacy settings can migrate once on startup after rename.
- All save/apply paths validate and prompt for missing dependencies before committing.
- World reloads automatically after applying baseline when new modules are enabled.

## Roadmap

### Next Release (v0.4.x)
1. Add global profile metadata in Baseline UI.
2. Show profile item count.
3. Show last-saved timestamp.
4. Add optional helper action: Select Required + Active.

### Following Release (v0.5.x)
1. Add first-run helper prompt for new worlds to apply global profile.
2. Improve status messaging for global profile operations.
3. Optional: add baseline export/import text utilities.

### Cleanup Release (Remove Temporary Migration)
1. Remove legacy migration function and call path.
2. Remove legacy migration flags:
   - legacyWorldSettingsMigrated
   - legacyClientSettingsMigrated
3. Remove legacy module ID constant and migratable key lists.

## Primary Files
- module.json
- scripts/main.js
- templates/baseline-modules.hbs
- templates/pack-selector.hbs
- styles/module.css

## Suggested Validation Pass (When Resuming)
1. In World A, save a custom global baseline profile — confirm dependency prompt appears if deps are unselected.
2. In World B, load and apply that global profile — confirm dependency prompt appears and world reloads.
3. Confirm required modules remain selected and locked in all actions.
4. Confirm uninstalled dependencies are skipped silently without error.
5. On world load with a module missing a dependency, confirm warning notification and console log appear.
4. Confirm Quick Insert results respect curated visibility for players and GMs.
5. Confirm startup migration notice appears only once on upgraded worlds.
