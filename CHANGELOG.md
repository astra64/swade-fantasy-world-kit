# Changelog

All notable changes to SWADE Fantasy World Kit are documented here. This file follows [Keep a Changelog](https://keepachangelog.com/) conventions.

Versions are organized from newest to oldest. Completed roadmap sections are archived here to keep [DEVELOPMENT.md](DEVELOPMENT.md) focused on active work.

---

## [0.5.4] - TBD

### Added
- **Preset Export/Import**: Export presets to clipboard as JSON with schema versioning; import presets with conflict detection
- **Conflict Handling**: When importing presets with missing modules, users can choose to "Import Anyway" (preserves all module IDs) or "Filter & Import" (removes missing modules)
- **Schema Versioning**: Export format includes `schemaVersion: 1` for forward compatibility with future schema changes

### Technical
- New `exportPreset()`, `exportPresetToClipboard()`, `importPreset()`, `validatePresetExport()` functions in preset-utils.js
- Separate Export/Import buttons in Manage Presets dialog
- Proper callback chaining for new preset selection after import

---

## [0.5.3] - TBD

### Added
- **World Setup Tools In-Repo Organization (Phase 1)**: Reorganized world setup tools into `scripts/world-setup-tools/` folder structure as first step toward full module extraction
- **Clean API Boundary**: Established `world-setup-tools/lib/index.js` as centralized API via `createWorldSetupToolsApi()`

### Technical
- Moved preset-utils.js, dependencies.js, BaselineModulesManager.js to dedicated folder structure
- Updated main.js imports and window API exposure
- No behavior changes, all workflows validated

---

## [0.5.2] - 2026-06-06

### Added
- **Preset Manager UX Polish**: Keep Manage Presets dialog open during create/rename/duplicate/delete operations instead of exiting to main window
- **Auto-select presets**: Newly created or modified presets are auto-selected in the Manage Presets dropdown
- **Active preset sync**: When Manage Presets dialog closes, the selected preset becomes active in the Preset Modules manager

### Changed
- **Default preset protection**: Default preset is now locked from both deletion and renaming (previously only deletion was blocked)
- **Preset management workflow**: Preset editing is now streamlined with the dialog staying open for multiple operations

### Technical
- Simplified preset management by setting active preset on dialog close instead of per-operation
- Removed unnecessary inline rerenders during CRUD operations

---

## [0.5.1] - In Progress

### Completed for v0.5.1
- **Foundry v14 Compatibility**: Validated all core features (preset manager, save/apply, curated visibility, pack access control) work correctly with Foundry v14. No breaking API changes. Updated module.json to require v14+. Added try-catch safeguards around pack method patching for robustness.

### Upcoming for v0.5.x
- v0.5.3: Preset export/import with versioning
- v0.5.4: Pack selector enhancements and folder visibility
- v0.5.5+: Code quality and orchestrator simplification

---

## [0.5.2] - Planned

### Changed
- **BaselineModulesManager ApplicationV2 Migration**: Migrate from deprecated V1 FormApplication to V2 ApplicationV2 API (removes deprecation warning appearing in v14, addresses removal planned for v16).

---

## [0.5.0] - Planned

### Changed
- **World Setup Tools Organization (In-Repo Phase 1)** (refactor, no behavior changes)
  - Reorganized preset/dependency code into `scripts/world-setup-tools/` folder structure as first step toward extracting into separate system-agnostic dependency module.
  - Moved `lib/preset-utils.js`, `lib/dependencies.js`, `apps/BaselineModulesManager.js`, `apps/ExtraVisiblePacksSelector.js` to new folder.
  - Created `world-setup-tools/lib/index.js` as centralized API export via `createWorldSetupToolsApi()`.
  - Updated `scripts/main.js` to import from new locations and wired window API exposure.
  - Removed duplicate functions (`buildSelectionSignature`, `openBaselineManager`).
  - Established clean API boundary for future full module extraction.

### Fixed
- Apply preset result display simplified (notification only, no confirmation dialog).

---

## [0.4.0] - 2025-06-06

### Added
- **Diff dialogs for preset operations**: Shows expected enable/disable changes before applying, and detailed per-action results after apply.
- **"Save & Apply" combo action**: Single button to save preset snapshot and apply it to world in one step.
- **Improved apply summary UX**: Detailed dialogs with module names (enabled/disabled/already enabled/missing) instead of flat notification text.
- **Preset ID validation**: Filters null/undefined entries and sanitizes invalid applied preset IDs on startup.

### Changed
- **Reorganized preset workflow buttons**: Revert moved to summary row, Save/Apply controls moved to footer for clarity.
- **Button layout**: Fixed positioning and visibility regressions in manager footer and preset selection row.

### Fixed
- Null ID filtering in remove button handler when rebuilding preset list.
- Footer visibility regression caused by conflicting CSS positioning.

### Validation
- Module loads in Foundry v13 with no init/ready errors.
- Preview Apply button shows expected diff with module names.
- Apply Preset displays detailed summary dialog per action.
- Preset manager reopens after reload when apply triggers world reload.

---

## [0.3.2] - 2025-05-15

### Added
- Full module consistency pass across codebase.

### Changed
- **README wording**: Updated to match current preset manager UI and workflow language.
- **Documentation alignment**: Kept docs aligned with authoritative preset apply behavior.

### Removed
- Unused legacy template.

### Fixed
- Module version bumped to reflect stability across refactored codebases.

---

## [0.3.1] - 2025-04-20

### Added
- **Preset-first terminology**: Renamed all UI and settings copy from "baseline" to "preset" wording.
- **Applied preset tracking**: Surface applied preset ID in manager summary as "Applied".
- **Preset state clarity**: Clear distinction between editing preset and applied preset.

### Changed
- **UI copy updates**:
  - "Save Selection" → "Save to Preset"
  - "Apply Baseline" → "Apply Preset"
  - Help chips, workflow copy, and summary labels updated
  - Apply confirmation and notifications updated
- **Manager wording**: Help tooltips and missing-entry messages now use preset terminology.
- **Button styling**: Replaced tiny gear-only control with labeled "Manage Presets" button.
- **Preset selector layout**: Restyle for stable sizing and clearer hierarchy.

### Fixed
- Search/header/footer layout regressions.
- Tooltip alignment with editing preset terminology.

---

## [0.3.0] - 2025-03-10

### Added
- **Code modularization**: Broke down monolithic main.js into focused, single-responsibility modules while preserving all existing behavior.
- **New module structure**:
  - `scripts/lib/preset-utils.js`: Preset parsing and state API
  - `scripts/lib/dependencies.js`: Dependency graph traversal and resolution
  - `scripts/apps/BaselineModulesManager.js`: Preset manager FormApplication
  - `scripts/apps/ExtraVisiblePacksSelector.js`: Pack visibility selector
  - `scripts/settings.js`: Settings and menu registration
  - `scripts/migrations.js`: Legacy migration and sanitizers
  - `scripts/ui.js`: Compendium styling, filtering, and Quick Insert sync

### Changed
- **main.js role**: Converted to orchestrator that wires factories, hooks, and cross-module integrations.
- **Public API exposure**: Required functions exposed on `window` for app-class interoperability.

### Fixed
- Removed duplicate leftover function from main.js that conflicted with extracted UI helpers.
- Preserved all existing user-facing behavior, settings flow, and UI interactions.

### Validation
- No diagnostics errors across refactored files.
- All duplicate/legacy in-file definitions removed.
- Hooks and startup flow remain centralized.

---

## [0.2.x] - Early Development

### Added
- **Baseline modules system**: Foundation for preset/dependency management.
- **Curated compendium visibility**: Filter player-visible packs with GM override.
- **Extra visible packs selector**: Allowlist specific packs for player access.
- **Quick Insert integration**: Sync restrictions to curated visibility rules.
- **Player pack access patching**: Respect curated filtering in pack access.
- **Keyboard shortcuts**: `Ctrl+Shift+B` to open Preset Modules manager (GM only).
- **GM quick access button**: Settings sidebar button for quick manager access.
- **Legacy settings migration**: Support for prior `swade-consolidated-fantasy-compendiums` module.

### Changed
- **Compendium organization**: Established folder groupings (Core, Equipment, Characters).

---

## [0.1.0] - Initial Release

### Added
- Initial module structure with consolidated Fantasy SWADE compendiums.
- 12 curated packs organized by category:
  - **Core**: Actions, Powers, Pregens
  - **Equipment**: Armor/Shields, Armor Sets, Gear, Magic Items, Weapons
  - **Characters**: Ancestries, Edges, Hindrances, Skills
- Game Icons integration (mostly unique icons per compendium).
- Foundry v13 compatibility.

---

## Roadmap Cleanup Policy

**When to Archive Completed Sections:**
- Archive completed roadmap sections to this CHANGELOG when the next major version ships (e.g., move v0.4.x from DEVELOPMENT.md to CHANGELOG when v0.5.0 releases).
- Keep only **current and future** roadmap sections visible in DEVELOPMENT.md.
- Add completed items to the CHANGELOG `## [X.Y.Z]` entry for the corresponding release.

**How to Clean Up:**
1. Before releasing a new major version, review DEVELOPMENT.md completed sections.
2. Move completed items to a new CHANGELOG entry with version number and date.
3. Remove the completed section from DEVELOPMENT.md.
4. Commit: `docs: archive v[N].x completed items to CHANGELOG for v[M].x release`.

**Benefits:**
- DEVELOPMENT.md stays focused on active/future work.
- Full historical record preserved in CHANGELOG.
- Git history + CHANGELOG provides complete decision trail.
