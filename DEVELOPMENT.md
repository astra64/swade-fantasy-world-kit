# SWADE Fantasy World Kit - Development and Roadmap

This file tracks current architecture, implemented behavior, release readiness checks, and near-term roadmap.

---

## Current Architecture

### Module Entry and Wiring

- `scripts/main.js`
  - Runtime orchestrator only.
  - Registers hooks (`init`, `ready`, sidebar/compendium renders).
  - Wires factories and exposes required APIs on `window` for app class interop.

### Libraries and Factories

- `scripts/lib/preset-utils.js`
  - Preset parsing and state API (`createPresetApi`).
- `scripts/lib/dependencies.js`
  - Dependency graph traversal and resolution (`createDependencyApi`).
- `scripts/settings.js`
  - Settings and menu registration (`setupSettings`).
- `scripts/migrations.js`
  - Legacy setting migration and sanitizers (`setupMigrations`).
- `scripts/ui.js`
  - Compendium styling/filtering, quick access injection, pack permission patching, Quick Insert sync (`setupUI`).

### Applications and UI

- `scripts/apps/BaselineModulesManager.js`
  - Preset Modules manager FormApplication.
  - Save to preset, apply preset, manage presets, dependency prompts.
  - `_calculateApplyPreview()`: Simulates apply without making changes; returns will-enable/will-disable/already-enabled/missing arrays.
  - `_showApplyPreview()`: Dialog showing dry-run diff before apply is confirmed.
  - `_showApplySummary()`: Dialog showing detailed per-action results after apply (module names, not just counts).
- `scripts/apps/ExtraVisiblePacksSelector.js`
  - Searchable pack visibility selector FormApplication.
- `templates/baseline-modules.hbs`
  - Preset Modules manager template.
- `templates/pack-selector.hbs`
  - Pack selector template.
- `styles/module.css`
  - Visual styling for manager UIs and compendium row theming.

---

## Current Behavior

### Preset Modules Manager

- Named presets are supported (create, rename, duplicate, delete).
- Editing flow is explicit:
  1. Choose preset.
  2. Adjust checked modules.
  3. Save to preset.
  4. Apply preset to world.
- Apply is authoritative:
  - Enables installed modules in the selected preset (plus required deps and approved dependency adds).
  - Disables active modules not in the selected preset (except this module itself).
  - Skips uninstalled modules.
  - Reloads world when activation changes are made.
- Applied preset ID is tracked separately from active editing preset ID.

### Curated Compendium Visibility

- Curated mode filters player-visible compendium packs.
- GM can bypass filtering via setting.
- Extra visible packs can be allowlisted via selector.
- Sidebar styling/filtering is re-applied on relevant render hooks.

### Integrations

- Quick Insert restrictions sync to curated visibility rules.
- Player pack access is patched to respect curated filtering.
- GM quick access button in Settings sidebar is supported.
- Keyboard shortcut to open Preset Modules manager is supported (`Ctrl+Shift+B`, GM only).

### Compatibility

- Legacy settings migration from `swade-consolidated-fantasy-compendiums` is still present.
- Migration cleanup is deferred to a dedicated cleanup release.

---

## Settings Inventory

### World Scope

- `curatedMode`
- `gmSeesAllPacks`
- `extraVisiblePacks`
- `baselineModules` (legacy/advanced compatibility)
- `baselineModuleTitles`
- `activeBaselinePresetId`
- `appliedBaselinePresetId`
- `legacyWorldSettingsMigrated`

### Client Scope

- `globalBaselineModules` (legacy/advanced compatibility)
- `globalBaselineModuleTitles` (legacy/advanced compatibility)
- `namedBaselinePresets`
- `legacyClientSettingsMigrated`
- `gmQuickAccessSidebarButton`

---

## Validation Checklist

Run this after significant code changes and before release.

1. Module loads in Foundry v14 with no init/ready errors.
2. Preset manager opens from settings menu and `Ctrl+Shift+B`.
3. Save to Preset persists changes to the selected preset.
4. **Preview Apply** button shows expected enable/disable diff with module names.
5. Apply Preset to World:
   - enables modules in preset,
   - disables active modules not in preset,
   - prompts for missing installed dependencies,
   - skips uninstalled modules,
   - shows detailed summary dialog with module names,
   - reloads world when needed.
6. Preset manager reopens after reload when apply triggered reload.
7. Curated compendium filtering works for players and GM override behaves correctly.
8. Quick Insert restrictions sync correctly when curated visibility changes.
9. Extra visible packs selector saves and updates visibility.

---

## Roadmap

**Current version:** v0.5.5 | **See [CHANGELOG.md](CHANGELOG.md) for completed version history and release notes.**

Roadmap items are assigned version numbers using semantic versioning (MAJOR.MINOR.PATCH):
- **Minor version bump** (0.X.0): New features or significant improvements
- **Patch version bump** (0.0.X): Bug fixes, optional variants, and smaller refinements
- **Major version** (reserved for far future): Breaking changes or major architectural shifts

### Near-Term Roadmap

Linear list of upcoming work, prioritized top-to-bottom.

1. **v0.5.6: Refine and expand icon mappings** — Review and test all 102 path mappings and 35 skill name mappings for accuracy. Verify matches against actual item icons in SWADE system and Fantasy Companion. Expand name-based mappings beyond Skills to cover Edges, Hindrances, Powers, and Ancestries. Document any gaps or incorrect mappings, add fallback refinements as needed.
   - Addresses: Mappings are the foundation of the remapper; confidence in accuracy is required before shipping FormApplication. Name-based matching for non-skill items improves match quality.
   - Approach: Manual review in Foundry, test remapper factory output against compendium items, add new name mappings for item types with common default icons, document edge cases.
   - Output: Updated icon-mappings.js with validated/refined path mappings and expanded name-based mappings for Edges/Hindrances/Powers/Ancestries; test report documenting coverage and known limitations.

2. **v0.6.0: Icon Remapping FormApplication** — Safe, preview-driven UI for remapping item icons with per-item checkboxes and scope selection (World / Selected Tokens / Scene Actors). Replaces the unsafe utility macro as the primary icon remapping tool.
   - Addresses: The current macro is destructive with no preview or rollback; users can't verify changes or target subsets of actors.
   - Approach: FormApplication (like Preset Modules Manager) with preview table showing old/new icons, checkboxes for per-item selection, scope radio buttons, and "Remap" button.
   - Files: `scripts/apps/IconRemapper.js`, `templates/icon-remapper.hbs`, updates to `scripts/main.js` and `README.md`.
   - Prerequisite: v0.5.6 mappings validation complete.

3. **v0.6.1: Icon Remapping Scoped Macro** — Simplified copy/paste macro alternative for users who prefer macro entry point over Settings menu. Launches FormApplication with scope dialog or applies icons to selected tokens directly.
   - Depends on: Icon Remapping FormApplication feature above.
   - File: `scripts/macros/remap-icons-scoped-macro.js`.

4. **v0.6.1: Investigate and repair Eberron Edges linked items** — Discovered broken linked items in Fantasy Edges arcane backgrounds during parallel curation (likely from restructuring). Needs investigation to understand scope and repair strategy before resuming content population.
   - Milestone: Fixes data integrity issue blocking curation.
   - Deliverable: Root cause analysis + repair process documented in DEVELOPMENT.md.

5. **v0.6.1: Test icon remapper with unlocked compendiums** — Validate end-to-end behavior: unlock a compendium, use Icon Remapping FormApplication, verify icons update correctly, lock compendium, verify persisted changes. Covers edge cases and confirms remapper idempotency.
   - Covered by: Validation checklist in DEVELOPMENT.md (icon remapper section).
   - Output: Pass/fail confirmation; any edge cases or bugs found during testing.

6. ⏸️ **v0.5.6-0.6.1: Pause Eberron Content Population** — Hold all Eberron compendium curation (beyond Ancestries) until Icon Remapping FormApplication is released and tested. The safe UI will allow curators to iterate confidently on compendium content without data loss risk.
   - Affected: Eberron Edges (currently in progress with discovered broken linked items), Eberron Actions, Armor & Shields, Armor Sets, Gear, Hindrances, Magic Items, Powers, Skills, Weapons.
   - Unblocked: Icon remapper infrastructure (factory, mappings, initial macro) is complete; testing with unlocked compendiums can continue in parallel.
   - Resume after: v0.6.1 ships with stable FormApplication and Eberron Edges fixed.

### Future Releases

Linear list of proposed features for future consideration, organized by target version.

**v0.7.0**

1. **Workflow and feature justification review** — Systematically document each user workflow the module enables (e.g., "GM swaps module presets between campaigns", "Player sees curated compendiums"). For each: identify the problem it solves, assess complexity vs. value, consider simpler alternatives. Ensures features justify their maintenance burden and design is sound.
   - Why: Prevents scope creep and ensures new features solve real user problems, not hypothetical ones.
   - Prerequisite: None; can be done independently to clarify roadmap direction.
   - Output: Updated DEVELOPMENT.md with documented workflows and feature justification decisions.
   - Decision gate: If review suggests deferring other features or pivoting focus, update roadmap accordingly before proceeding.

**v0.7.1**

None currently planned. May add items here based on v0.7.0 workflow review findings.

**v0.8.0+**

4. **Developer tools for compendium management** — Helper UI for `module.json` updates, validation tools, or other workflow improvements for adding/managing custom compendiums.
   - Status: Low priority. Currently manual but straightforward enough that automation is optional.
   - Evaluate first: Does this solve a real pain point? Is the manual workflow fast enough to defer indefinitely?
   - Defer indefinitely if: Manual process remains fast and error-free in practice.

### Cleanup and Maintenance

- **v0.7.0+: Cleanup Release** — Remove legacy migration function and flags, legacy constants, and old setting compatibility scaffolding. Scheduled after stabilization window.
- **v1.6.0+: BaselineModulesManager ApplicationV2 Migration** (⏸️ deferred to v16 era) — Migrate from deprecated V1 FormApplication to V2 ApplicationV2 when Foundry v16 approaches. See [APPLICATIONV2_MIGRATION.md](APPLICATIONV2_MIGRATION.md) for detailed migration plan. Currently deferred: FormApplication works reliably; V2 complexity not justified while v16 is years away.

### Post-Roadmap Modularization (Parked)

- Status: Parked until current roadmap items are completed or explicitly removed.
- Timing: Phase 1 (in-repo organization) is scheduled as part of v0.5.x work. Phase 2 (full module extraction) is planned for after v0.5.x stabilizes (v0.6.x or later).
- Goal: extract world setup tools into a system-agnostic dependency module while expanding SWADE hub module with genre/setting compendium support and character creation tools.

#### Target Architecture

**Module 1: SWADE Fantasy World Kit (Hub/Composer)**
- Curated compendiums: expand from single Fantasy set to multi-genre/setting support (Fantasy, Scifi, Eberron, Warhammer, etc.).
- Controlled visibility: pack allowlisting and GM override, scoped per active genre/setting.
- Simple character creation tools: skill calculator, edges/hindrances UI (minimal—no prerequisite checking), integrated with active compendium set.
- Settings ownership: genre/setting selection, pack visibility per context, character creation preferences.

**Module 2: World Setup Tools (System Agnostic)**
- Preset/dependency engine and manager UI.
- Used by: SWADE hub module and any other system module that needs preset management.
- No Foundry system/module dependencies beyond core Foundry APIs.

**Module 3: Character Creation Tools (Recommendation)**
- **Decision: Keep in SWADE hub module as a separate code organization**, not a separate module. Reasoning:
  - SWADE-specific tooling; no identified reuse in other modules.
  - Tightly couples to active compendium set selection (edges, hindrances, skills lists vary by genre).
  - Simpler dependency graph: character tools use hub settings, not the reverse.
  - Allows shipping character tools updates together with compendium set additions without multi-module coordination.
  - Can be cleanly separated in code structure (e.g., `scripts/apps/character-creation/`, `templates/character-*.hbs`) for future refactor if needed.

#### Planned Extraction Scope

1. World Setup Tools module:
   - `scripts/lib/preset-utils.js` (extract)
   - `scripts/lib/dependencies.js` (extract)
   - `scripts/apps/BaselineModulesManager.js` (extract with renaming)
   - `templates/baseline-modules.hbs` (extract with renaming)
   - Relevant CSS classes from `styles/module.css` (extract)
   - Preset-specific settings keys (migrate/create in new module)

2. SWADE Hub module (keep and enhance):
   - Curated compendiums: generalize pack folder/group logic to support multiple genre sets.
   - Controlled visibility: parameterize per genre/setting context.
   - Character creation tools: new files in `scripts/apps/character-creation/` and `templates/character-*.hbs`.
   - Compendium integration: unify visibility filtering to apply to active genre set.

#### Guardrails Before Starting Extraction

- Complete and stabilize Near Term and Mid Term roadmap work.
- Keep preset apply behavior as an unchanged core contract during extraction and handoff.
- Preserve SWADE hub module ownership of curated compendiums, visibility control, and character creation tooling.
- Preserve setting key compatibility with migrations during transition windows.
- Ensure World Setup Tools module is testable independently of SWADE system or content.
- Validate that character creation tools integrate cleanly with genre/setting switching (no hardcoded pack dependencies).

#### Phase 1: In-Repo Organization (Before Full Module Extraction)

Goal: Reorganize world setup tools into a dedicated folder structure to test separation and establish API boundaries without creating a separate module yet.

**Folder Structure (Phase 1):**
```
scripts/
  world-setup-tools/
    lib/
      preset-utils.js (moved from scripts/lib/)
      dependencies.js (moved from scripts/lib/)
      index.js (exports public API)
    apps/
      BaselineModulesManager.js (moved from scripts/apps/)
    settings.js (preset-specific settings; extracted from scripts/settings.js)
  apps/
    character-creation/
      (new, for future character tools)
    ExtraVisiblePacksSelector.js (stays here; compendium visibility)
  (other non-preset files stay at scripts/ root)
templates/
  world-setup-tools/
    baseline-modules.hbs (moved from templates/)
styles/
  world-setup-tools/
    presets.css (extracted preset-specific CSS from module.css)
```

**Phase 1 Deliverables:**
1. Folder reorganization with no behavioral changes.
2. Establish `scripts/world-setup-tools/lib/index.js` as the public API surface:
   - Export `createPresetApi`, `createDependencyApi`, and manager class.
   - Document API contract (inputs, outputs, hooks, settings keys).
3. Update `scripts/main.js` to import from new location and ensure all integrations still work.
4. Update `scripts/settings.js` to keep only SWADE-specific settings (curated mode, visibility) and extract preset settings to `world-setup-tools/settings.js`.
5. Update `styles/module.css` to import preset styles from `world-setup-tools/presets.css`.
6. Run validation checklist to ensure no behavior regression.
7. Commit: "refactor: organize world setup tools into dedicated folder structure (Phase 1)".

**Phase 1 Benefits:**
- Clean code boundary without repository fragmentation.
- Test API isolation and identify missed dependencies before module split.
- Easier to refactor settings ownership incrementally.
- Can ship this as a minor version in current module (e.g., v0.4.0).
- Single Copilot session for refactor, no multi-repo juggling yet.

#### Phase 2: Module Extraction (After Phase 1 Stabilizes)

Once Phase 1 is complete and validated in a few releases:
1. Create separate `foundry-world-setup-tools` repository.
2. Move `scripts/world-setup-tools/` folder and associated templates/styles.
3. Create new `module.json` for World Setup Tools module.
4. Update SWADE hub module to declare World Setup Tools as a dependency and import from it.
5. Migrate SWADE hub settings to new module settings schema.
6. Maintain compatibility shim in SWADE hub for settings migration during transition window.

#### Workflow and Dependencies

- Phase 1 (in-repo): Use this repo, single Copilot session.
- Phase 2 onwards: Use one VS Code multi-root workspace for SWADE hub and World Setup Tools modules (plus any others) to keep a single Copilot session while developing in parallel.
- Dependency flow: SWADE hub → World Setup Tools (plugin), no reverse dependency.
- Character creation tools within hub depend on compendium set state but not vice versa.

---

## Notes for Contributors

- Prefer small, behavior-preserving edits.
- Keep public settings keys stable unless migration is included.
- Treat preset apply behavior as a core contract: preset is authoritative.
- Validate in Foundry after refactors even when static diagnostics are clean.
- When proposing features or refactors, critically question: what problem does this solve? Can users achieve the same goal another way with less complexity? Be willing to suggest simplifications or deprioritizations if the underlying need is unclear.
