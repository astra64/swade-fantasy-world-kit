# SWADE Fantasy World Kit — Development Notes

This file tracks feature implementation status, the roadmap, Copilot session context, and validation checklists.

---

## Codebase Map

| File | Purpose |
|---|---|
| `module.json` | Module manifest — packs, packFolders, relationships, manifest/download URLs |
| `scripts/main.js` | All runtime logic — settings, UI classes, compendium row styling |
| `templates/baseline-modules.hbs` | Baseline Module Manager UI template |
| `templates/pack-selector.hbs` | Choose Visible Packs UI template |
| `styles/module.css` | All CSS — compendium row theming, UI layout |

---

## Architecture Notes

- **Foundry VTT v13**, `FormApplication` subclass pattern
- Module ID: `swade-fantasy-world-kit`
- Legacy ID (for migration): `swade-consolidated-fantasy-compendiums`
- Settings storage: `game.settings.get/set`, scope `world` or `client`
- Cross-reload state: `localStorage` key `swade-fwk-reopen-baseline`
- Compendium row styling applied via `Hooks.on("renderCompendiumDirectory")`, `Hooks.on("renderSidebarTab")`, and a `Hooks.once("ready")` fallback

### Key Functions in main.js

| Function | Purpose |
|---|---|
| `styleAndFilterCompendiumRows(htmlRoot)` | Applies `.scfc-swade-pack` class + banner image to module rows; hides rows in curated mode |
| `getCompanionBannerUrl()` | Reads banner src from rendered Fantasy Companion DOM row; cached after first call |
| `isPackAllowedForUser(packId, user)` | Returns true if the pack should be visible to a user in curated mode |
| `applyPlayerPackAccessPatch()` | Patches `pack.testUserPermission` for player-side pack access control |
| `syncQuickInsertPackRestrictions()` | Syncs Quick Insert indexing disabled list to match curated visibility |
| `parseTitlesMap(raw)` / `updateTitleCache(key, ids)` | JSON title cache for configured baseline entries |
| `collectAllDependencies(ids)` / `resolveMissingDependencies(ids, config)` | Dependency resolution |
| `promptForDependencyResolution(ids, missing)` | Dialog to include missing installed dependencies |
| `validateModuleDependencies()` | Warns GMs on ready if active modules have inactive dependencies |
| `migrateLegacyModuleSettings()` | One-time migration from old module ID (to be removed next version) |

---

## Implemented Features

### Curated Compendium Visibility
- [x] Curated mode limits player-facing compendium visibility
- [x] GM visibility override (`gmSeesAllPacks` setting)
- [x] Extra-visible pack whitelist via searchable selector
- [x] Compendium sidebar filtered on render via hooks

### Quick Insert Integration
- [x] Sync Quick Insert indexing restrictions on ready and on settings change
- [x] PLAYER and TRUSTED roles restricted from hidden packs
- [x] GAMEMASTER role restricted when GM sees all is off

### Compendium Row Theming
- [x] `.scfc-swade-pack` class applied to module pack rows
- [x] Gold left border and box-shadow via CSS
- [x] Entry name colour override via CSS
- [x] Banner image replaced with Fantasy Companion Action Deck image (sourced from DOM)
- [x] Banner URL cached after first DOM read

### Baseline Module Manager
- [x] Searchable installed modules list
- [x] Active Only toggle (combines with search)
- [x] Two-column grid layout for installed modules
- [x] Module IDs hidden by default, shown on row hover
- [x] Summary chips: installed / selected / baseline counts
- [x] Sticky panel headers and sticky footer
- [x] All buttons have descriptive hover tooltips
- [x] Window drag-resizable
- [x] Required dependencies locked (non-deactivatable)
- [x] Select Active Modules and Clear Selection both preserve required modules
- [x] Dependency resolution on all save/apply paths
- [x] Uninstalled dependencies skipped silently
- [x] Apply result shown as single toast notification
- [x] World auto-reloads after applying baseline (new modules enabled)
- [x] Baseline manager window auto-reopens after reload
- [x] Startup validation warns GMs of missing active module dependencies
- [x] This module hidden from installed modules list

### Baseline Manager — Configured Entries
- [x] Configured entries shown in collapsible section
- [x] Module title shown (with ID below)
- [x] Title cache persists across uninstall (world + client scopes)
- [x] Missing entries have actionable hover tooltip
- [x] Each entry has hover-visible × remove button

### Global Baseline Profile
- [x] Global profile stored as client-scoped setting
- [x] Global title cache also client-scoped
- [x] Load Global Profile button
- [x] Save Selection as Global button
- [x] Apply Global to This World button (replaces world baseline and applies)

### Pack Selector UI
- [x] Two-column pack grid with hover-only pack ID tooltips
- [x] Module-owned packs excluded from list; count shown as note
- [x] "Select Active Modules" button
- [x] All buttons have descriptive hover tooltips
- [x] Window drag-resizable

### Rename and Backward Compatibility
- [x] Module renamed to SWADE Fantasy World Kit
- [x] ID changed to `swade-fantasy-world-kit`
- [x] One-time legacy migration from `swade-consolidated-fantasy-compendiums`

---

## Roadmap

### v0.5.x — Global Profile UX
- [ ] Global profile metadata: item count, last-saved timestamp
- [ ] First-run helper prompt in new worlds to apply global profile
- [ ] Improve status messaging for global profile operations

### v0.5.x — SWADE TOC Integration (optional, behind setting)
- [ ] Mirror SWADE Compendium TOC filter state into effective pack visibility
- [ ] Document precedence rules (this module's curated packs always win)
- [ ] Reuse existing compendium rerender + Quick Insert sync flow

### v0.6.x — Actor Integration
- [ ] Add a world setting (default: on) that causes newly-created actors to pull core skills from this module's custom skills compendium instead of the SWADE system defaults
- [ ] Add a practical user-facing migration entry point, either as an actor sheet action or a macro, to replace existing skills, edges, hindrances, items, powers, and similar records with this module's compendium versions
- [ ] Define safe matching and replacement rules so the actor migration tool does not duplicate entries or overwrite intentionally-customized content without confirmation

### v0.6.x — Baseline Utilities
- [ ] Baseline export/import (JSON format) for sharing and backup
- [ ] Save and reapply selected settings from other modules so a GM can carry world configuration between worlds
	- Later design questions: selected modules vs selected settings keys, where profiles should live (world/client/JSON), and how to handle missing modules or conflicting target-world values

### v0.7+ — Named Presets
- [ ] Replace single baseline slot with named preset system
- [ ] UI to create, rename, delete, and apply presets
- [ ] Global profile extended to support multiple named global presets
- [ ] Presets importable/exportable as JSON

### Cleanup Release (next version after migration window)
- [ ] Remove `migrateLegacyModuleSettings()` and its call
- [ ] Remove `legacyWorldSettingsMigrated` and `legacyClientSettingsMigrated` settings
- [ ] Remove `LEGACY_MODULE_ID` constant and `MIGRATABLE_*_SETTING_KEYS` arrays

### Future — Standalone System-Agnostic Module
- [ ] Investigate extracting baseline management into a standalone module with no system dependency
- [ ] This module retains SWADE compendiums and curated visibility

---

## Validation Checklist

Run this after any significant change or before a release.

### Regression (run first)
1. Load a world with SWADE system active — confirm no console errors on init
2. Confirm curated pack visibility filters correctly for players
3. Confirm Quick Insert restrictions sync on ready
4. Confirm required modules are locked in the baseline UI

### Baseline Dependency Flow
5. Save a custom global baseline in World A — confirm dependency prompt appears if deps unselected
6. Load and apply that global profile in World B — confirm dependency prompt and world reload
7. Confirm required modules remain selected and locked in all actions
8. Confirm uninstalled dependencies are skipped silently
9. On world load with a module missing a dependency, confirm warning notification + console log

### Baseline Entry UX
10. Open baseline manager, expand "Current baseline entries"
11. Hover a missing entry — confirm tooltip with fix instructions
12. Confirm module title shown (not just ID) for known entries
13. Hover a row and click × — confirm immediate removal and window refresh
14. Apply baseline — confirm world reloads and baseline manager reopens automatically

### Pack Selector
15. Open pack selector — confirm module-owned packs absent and note shows correct count
16. Click "Select Active Modules" — confirm only packs from active modules are checked

### Compendium Row Theming
17. Open compendium sidebar — confirm module pack rows have gold left border
18. Confirm banner images show the Fantasy Companion Action Deck image
19. Confirm non-module rows are unaffected

---

## Compendium Editing Workflow

### Edit an Existing Compendium
1. Open Foundry as GM in a world with this module enabled.
2. Open the target compendium pack, unlock it, and make edits in the Foundry UI.
3. Re-lock the pack when done.
4. Close Foundry cleanly so pack database files are fully written to disk.
5. In VS Code, review changed files under `packs/<pack-name>/` and commit.

### Add a New Compendium
1. Create the new compendium pack in Foundry as a module pack (set document type and system).
2. Populate or import entries in Foundry.
3. Close Foundry cleanly.
4. Add a new pack entry to `module.json` under `packs` with `name`, `label`, `path`, `type`, `ownership`, and `system`.
5. Add the new pack `name` to the appropriate `packFolders` group in `module.json`.
6. Restart Foundry and confirm the pack appears and behaves correctly with curated visibility.
7. Commit both the new `packs/<pack-name>/` database files and the `module.json` changes.

> Packs from this module are visible by default in curated mode. External packs must be allowlisted via "Choose Visible Packs".

---

## Copilot Session Notes

### General Context
- This is a solo-developer Foundry VTT module, iterated in VS Code with GitHub Copilot
- The user is the GM/developer; changes are tested in a local Foundry install
- Prefer minimal, targeted changes — no speculative refactoring or extra abstractions
- All templates use Handlebars; CSS uses custom properties and `color-mix()`

### Known Gotchas
- `pack.metadata?.banner` always returns null for Fantasy Companion packs — do not use it
- The banner URL must be read from the rendered DOM (`img.compendium-banner`) after Foundry renders the compendium sidebar
- `COMPANION_BANNER_CACHE` caches the URL after first read — invalidate if companion isn't installed
- Inline styles (via `element.style`) override CSS class styles — avoid using both for the same property
- `replace_string_in_file` requires exact literal match including whitespace — always read the file first
- PowerShell `Set-Content` defaults to UTF-16 on some systems — caused non-ASCII encoding bugs; use `replace_string_in_file` for file edits instead

### Settings Keys
| Key | Scope | Type | Purpose |
|---|---|---|---|
| `curatedMode` | world | Boolean | Enables curated visibility |
| `gmSeesAllPacks` | world | Boolean | GM bypass for curated mode |
| `extraVisiblePacks` | world | String | Newline-separated pack IDs |
| `baselineModules` | world | String | Newline-separated module IDs |
| `baselineModuleTitles` | world | String | JSON map of `{id: title}` |
| `globalBaselineModules` | client | String | Newline-separated module IDs |
| `globalBaselineModuleTitles` | client | String | JSON map of `{id: title}` |
| `legacyWorldSettingsMigrated` | world | Boolean | Migration flag (remove next version) |
| `legacyClientSettingsMigrated` | client | Boolean | Migration flag (remove next version) |
