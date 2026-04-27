# SWADE Fantasy World Kit - Feature List and Roadmap

Last updated: 2026-04-28

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

### Baseline Module Manager UI (v0.4.x)
- Compact single-row toolbar with all action buttons (24px height, 11px font).
- Summary chip row shows live counts: Installed, Active, Selected, Required, and Configured.
- Installed modules panel uses a two-column grid layout for density.
- Module IDs are hidden by default and shown on row hover for a cleaner look.
- Row heights in the installed grid are normalised for visual consistency.
- Sticky panel headers show section title and module count; installed panel header includes quick-filter chips.
- Quick filter chips in the installed panel: All, Active, Selected, Required — combined with the search input.
- Configured entries (world baseline) are shown in a compact responsive card grid.
- Sticky footer holds Save and Apply Baseline buttons, always visible regardless of scroll position.

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
- Installed modules panel uses two-column grid with normalised row heights.
- Quick filter chips (All / Active / Selected / Required) filter the installed modules list live.
- Module IDs are hover-only in the installed panel.
- Summary chips reflect live counts of installed, active, selected, required, and configured modules.

## Roadmap

### v0.4.x — UX and UI Improvements (in progress)
- Add a dedicated **Active Only** toggle button to the installed modules panel header to quickly filter to currently active modules.
- Clearer status indicators in the baseline module list (e.g. missing deps flagged inline).
- Better feedback during apply (progress, what was skipped, what failed).
- Decide how to handle this module in baseline selection UI (hide it, or show as locked/always included).

### v0.5.x — Global Profile UX
- Global profile metadata display: item count, last-saved timestamp.
- First-run helper prompt for new worlds to apply global profile.
- Improve status messaging for global profile operations.

### v0.6.x — Baseline Utilities
- Add baseline export/import utilities (JSON format) for sharing and backup.

### vX.x — Cleanup Release (Remove Temporary Migration)
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

**Note: SWADE system and modules were updated before this session ended. Verify compatibility before continuing work.**

### Regression Check (run first)
1. Load a world with the updated SWADE system and confirm the module initialises without console errors.
2. Confirm curated pack visibility still filters correctly for players.
3. Confirm Quick Insert restrictions still sync on ready.
4. Confirm required modules are still locked in the baseline UI.

### Baseline Dependency Flow
5. In World A, save a custom global baseline profile — confirm dependency prompt appears if deps are unselected.
6. In World B, load and apply that global profile — confirm dependency prompt appears and world reloads.
7. Confirm required modules remain selected and locked in all actions.
8. Confirm uninstalled dependencies are skipped silently without error.
9. On world load with a module missing a dependency, confirm warning notification and console log appear.
4. Confirm Quick Insert results respect curated visibility for players and GMs.
5. Confirm startup migration notice appears only once on upgraded worlds.
