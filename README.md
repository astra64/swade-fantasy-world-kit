# SWADE Fantasy World Kit - Feature List and Roadmap

Last updated: 2026-05-03

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
- Summary chip row shows live counts: Installed, Selected, and Baseline entries.
- Installed modules panel uses a two-column grid layout for density.
- Module IDs are hidden by default and shown on row hover for a cleaner look.
- Row heights in the installed grid are normalised for visual consistency.
- Sticky panel headers show section title and module count.
- Active Only toggle in the installed panel combines with search.
- Inline dependency indicators are shown on rows with dependency issues.
- Configured entries (world baseline) are shown in a compact responsive card grid.
- Sticky footer holds Save and Apply Baseline buttons, always visible regardless of scroll position.

### Pack Selector UI (v0.4.x)
- Two-column pack grid with normalised row heights for better scanability.
- Pack IDs are shown on hover (opaque tooltip card) instead of inline.
- Choose Visible Packs window is drag-resizable.

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
- Active Only toggle button filters installed modules and combines with search.
- Baseline Modules parent window is drag-resizable.
- Baseline module rows show inline dependency indicators for dependency issues.
- Module IDs are hover-only in the installed panel.
- Summary chips reflect live counts of installed, selected, and baseline entry counts.
- Choose Visible Packs list is presented as a two-column grid with hover-only pack IDs.
- Choose Visible Packs window is drag-resizable.

## Compendium Content Workflow

### Edit Existing Included Compendiums
1. Open Foundry as GM in a world with this module enabled.
2. Open the target module compendium pack, unlock it, and make your content edits in the Foundry UI.
3. Re-lock the pack when finished editing.
4. Close Foundry cleanly so pack database files are fully written to disk.
5. In VS Code, review changed files under `packs/<pack-name>/` and commit those changes.

### Add a New Included Compendium
1. Create the new compendium pack in Foundry as a module pack (set the correct document type and system).
2. Populate or import entries in Foundry.
3. Close Foundry cleanly.
4. Add a new pack entry to `module.json` under `packs` with `name`, `label`, `path`, `type`, `ownership`, and `system`.
5. Add the new pack `name` to the appropriate `packFolders` group in `module.json`.
6. Restart Foundry and confirm the new pack appears in the sidebar and behaves correctly with curated visibility.
7. Commit both the new `packs/<pack-name>/` database files and the `module.json` metadata updates.

### Important Notes
- Do not hand-edit `.ldb` files directly.
- Do not commit while Foundry is running (avoids partial writes and lock-state issues).
- If curated mode is enabled, packs from this module are visible by default; external packs must be allowlisted via the "Choose Visible Packs" setting.

## Roadmap

### v0.4.x — Next Up (prioritized)
- Finalize pack selector module-owned compendium behavior:
  - Default selected on open
  - Required/locked
  - Dedicated helper action button
  - Recommended direction: default selected + helper button; avoid hard-locking unless compatibility requires it
- Improve apply feedback with a clearer completion summary (enabled now, already enabled, missing/skipped, dependency auto-includes).
- Decide and implement self-module behavior in baseline selection UI (hidden vs locked/always included).

### v0.5.x — Global Profile UX
- Global profile metadata display: item count, last-saved timestamp.
- First-run helper prompt for new worlds to apply global profile.
- Improve status messaging for global profile operations.

### v0.5.x — SWADE TOC Integration (optional, behind setting)
- Add optional setting: Mirror SWADE Compendium TOC Filters.
- Keep this module's curated visibility settings as the primary source of truth.
- When mirror mode is enabled, read SWADE Compendium TOC filter state and merge it into effective pack visibility.
- Define and document precedence rules:
  - This module's required/curated packs remain visible.
  - SWADE TOC filters can hide/show external packs.
  - This module's extra-visible allowlist remains an override for curated mode.
- Reuse existing refresh flow after TOC-driven changes (compendium rerender + Quick Insert restrictions sync).

### v0.6.x — Baseline Utilities
- Add baseline export/import utilities (JSON format) for sharing and backup.

### v0.7+ — Named Presets
- Replace the single baseline slot with a named preset system.
- GMs can save multiple named module presets (e.g. "Full Campaign", "Lite Session", "Player Demo").
- UI to create, rename, delete, and apply presets from a list.
- Global profile slot replaced (or extended) to support multiple named global presets.
- Presets stored as JSON; importable/exportable for sharing between GMs.

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
