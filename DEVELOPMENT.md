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
- `bonusEdgePointAbilityNames` — comma-separated ancestral ability names (e.g. "Adaptable") that grant a free Edge point in the Character Manager, matched by name so it works with any compendium/setting

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

**Current version:** v0.5.6 | **See [CHANGELOG.md](CHANGELOG.md) for completed version history and release notes.**

Roadmap items are assigned version numbers using semantic versioning (MAJOR.MINOR.PATCH):
- **Minor version bump** (0.X.0): New features or significant improvements
- **Patch version bump** (0.0.X): Bug fixes, optional variants, and smaller refinements
- **Major version** (reserved for far future): Breaking changes or major architectural shifts

### Near-Term Roadmap

Linear list of upcoming work, prioritized top-to-bottom.

1. **v0.6.0: Character Manager — Unified Character Creation & Advancement Tools** — Build SWADE character creation support plus guided advancement automation for hassle-free campaign progression.
   - Addresses: The module should support actual character building workflows, not just compendium curation. Guided advancement helps players and GMs apply experience, edge points, and item upgrades consistently.
   - Approach: Single unified FormApplication for editing and mid-campaign management of an existing actor (similar to Pathbuilder for PF2e, minus the "start from nothing" step). This tool never creates the actor document itself — a GM/player creates a blank actor through Foundry's normal flow first, then opens Character Manager from that actor's sheet. Follows official SWADE rulebook flow: Concept → Ancestry → Hindrances → Attributes → Skills → Edges → Gear → Summary. Features hindrance trade-off system, auto-applied ancestry bonuses, real-time budget tracking, and gear drag-drop interface.
   - Files: `scripts/apps/CharacterManager.js`, `templates/character-creation/character-manager.hbs`, `scripts/apps/character-creation/handlers/*.js`, updates to `scripts/lib/calculator.js` and `scripts/lib/compendium-utils.js`, `styles/character-manager.css`, `scripts/main.js`, `README.md`.
   - **Status (v0.6.0 Phase 1: Character Creation & Editing)**: Concept, Ancestry, Hindrances, Traits (Attributes & Skills), Edges, and Gear tabs complete and tested in-Foundry. Template modularized into Handlebars partials for maintainability. Ancestry bonuses automatically detected from ability effects with lock minimums. Skill and attribute descriptions displayed on hover, with short one-line attribute tips. Edges and Hindrances display "Granted by X" child items (e.g. Arcane Background grants) the same way Ancestry displays ancestral abilities, all collapsible. Drag-and-drop works on all tabs and accepts any item — from the configured compendium or not — with a name-matching fallback when it isn't. Hindrance perk allocations (Raise Attribute, Gain Skill Point, Choose an Edge) all correctly add bonus points to their respective budgets; hindrance selection itself has no point cap (only the perk slots hindrance points grant are limited). Ancestry abilities that grant a free Edge (e.g. Humans' "Adaptable") add to the edge point budget too, matched by name against a configurable world setting (`bonusEdgePointAbilityNames`) rather than compendium-specific tagging, so it works with any setting's Human-equivalent ancestry. Summary (read-only recap with color-coded budget rows) and a new Advancement tab (record Edge/Two Skills/One Skill/Attribute/Hindrance Buyoff advances, grouped by Rank, reading/writing SWADE's real `system.advances.list` and feeding bonus points into the Edges/Traits/Hindrances tabs' existing budgets) are also complete, bringing the tool to all 9 tabs — Gear, Summary, and Advancement are implemented but not yet tested in-Foundry. **Save is now real for every tab**: Skills/Edges/Hindrances/Gear all reconcile actual embedded Items on save (existing items patched in place — die/advances, major/minor, quantity — never deleted and recreated; new selections created; removed ones deleted), replacing the earlier scaffold that wrote to a non-existent `actor.system.skills/edges/hindrances` field and was silently discarded by Foundry. Detection/matching for all four tabs keys by the actor's own item uuid (never a compendium uuid) to avoid collapsing distinct same-named items or breaking picker "already selected" checks; compendium name-matching is used only for display fallback and for the optional "Use Curated Skill Icons" setting. Attribute die changes now correctly persist (previously written in the wrong schema shape and dropped). Compendium data is cached per session and fetched via indexed fields instead of one document per item, cutting open time significantly; Save now closes the window instead of leaving it open with stale state. **Gear tab expanded (not yet tested in-Foundry)**: shows the actor's real current currency alongside the creation budget; a Starting Equipment/Gear Management mode toggle switches what the footer tracks; carried-weight/encumbrance tracking mirrors SWADE's own carry-capacity formula; and currency only ever changes on Save via an explicit opt-in checkbox with a live preview, never as an automatic side effect of Save. Gear-type items belonging to the separate "SWADE Fantasy Currencies" module (coin items it manages itself) are excluded from the Gear tab entirely. **Ancestry tab additions (not yet tested in-Foundry)**: an ancestry-granted attribute die is now correctly treated as a free floor rather than counted against the player's 5 attribute points; ancestral abilities with no mechanical effects of their own (e.g. Half-Elf's Heritage) can offer a bonus-choice dropdown (Edge/Attribute/Skill point), gated by a configurable world setting (`ancestryChoiceAbilityNames`, same pattern as `bonusEdgePointAbilityNames`); and a "Manual Adjustments" section lets a GM/player add or subtract points from any budget with a note, for setting rules this tool can't otherwise anticipate. See `docs/v0.6.0/CHARACTER_MANAGER.md`'s Gear tab section and Testing Checklist for details.
   - **Detailed Specification:** [docs/v0.6.0/CHARACTER_MANAGER.md](docs/v0.6.0/CHARACTER_MANAGER.md) — Contains complete UX design, implementation phases, tab-by-tab specs, testing checklist, estimated effort, and success criteria.
   - **Testing:** No separate test-case file exists yet — `docs/v0.6.0/TESTING.md` was planned but never created. Milestone 5 in [docs/v0.6.0/CHARACTER_MANAGER.md](docs/v0.6.0/CHARACTER_MANAGER.md) is the authoritative "has this been tested" status (currently: no formal pass has happened).
   - Prerequisite: curated compendium access and existing compendium visibility/integration flow.
   - Output: SWADE-focused character management tool supporting creation, editing, and advancement workflows with real-time SWADE rule compliance checking.

2. **v0.6.1: Icon Remapping FormApplication** — Safe, preview-driven UI for remapping item icons with per-item checkboxes, scope selection (World / Selected Tokens / Scene Actors), and **per-item fallback override** button. When smart mappings are incorrect, users can click "Use Fallback" to switch that item to its type-specific default icon instead of the smart-mapped one. Replaces the unsafe utility macro as the primary icon remapping tool.
   - Addresses: The current macro is destructive with no preview or rollback; users can't verify changes or target subsets of actors. Smart mappings may be incorrect for some items, so users need a way to correct without manual icon selection.
   - Approach: FormApplication (like Preset Modules Manager) with preview table showing old/new icons, checkboxes for per-item selection, scope radio buttons, and per-item "Use Fallback" override. Main "Remap" button applies checked items using their displayed (mapped or fallback) icon.
   - Files: `scripts/apps/IconRemapper.js`, `templates/icon-remapper.hbs`, updates to `scripts/main.js` and `README.md`.
   - Prerequisite: v0.5.6 mappings validation complete.

3. **v0.6.2: Icon Remapping Scoped Macro** — Simplified copy/paste macro alternative for users who prefer macro entry point over Settings menu. Launches FormApplication with scope dialog or applies icons to selected tokens directly.
   - Depends on: Icon Remapping FormApplication feature above.
   - File: `scripts/macros/remap-icons-scoped-macro.js`.

4. **v0.6.2: Test icon remapper with unlocked compendiums** — Validate end-to-end behavior: unlock a compendium, use Icon Remapping FormApplication, verify icons update correctly, lock compendium, verify persisted changes. Covers edge cases and confirms remapper idempotency.
   - Covered by: Validation checklist in DEVELOPMENT.md (icon remapper section).
   - Output: Pass/fail confirmation; any edge cases or bugs found during testing.

5. **v0.6.3: Compendium Generation Tool** — Deprecate shipped premium compendium content and provide an export/import workflow for user-created compendiums.
  - Addresses: Avoid shipping proprietary Fantasy Companion content while still giving GMs an easy way to recreate custom compendiums from installed official modules.
  - Approach: Let users build a compendium in the Foundry UI, export it in a minimal format, and import that export in another world to rebuild the same compendium from official content.
   - Files: `scripts/apps/CompendiumRecipeBuilder.js`, `templates/compendium-recipe-builder.hbs`, `scripts/main.js`, `README.md`.
   - Prerequisite: official SWADE modules installed in the target world and robust pack item lookup by name/identifier.
   - Output: Public-friendly toolkit behavior that retains personal workflow support without shipping premium content.

6. **v0.7.0: Compendium Sync Workflow Between Local and Hosted Foundry** — Document and validate safe process for syncing custom compendium edits between local Foundry dev instance and Molten Hosting server without manual re-creation or data loss.
   - Context: Module remains private (personal use) on GitHub. Pain point: Local changes to packs (edits, new items) need to sync to hosted server; currently manual and error-prone.
   - Solution: Simple zip-upload workflow via Molten web file manager. Full step-by-step procedures documented in README (see "Syncing Compendiums Between Local and Hosted Foundry").
   - Safeguards: Always close both Foundry instances before file operations (LevelDB corruption risk). Validate pack integrity after each sync.
   - Future optimization: Once World Setup Tools is extracted as public module, can keep it on Foundry registry (auto-updates via manifest) while keeping this private module manual-synced. If zip-upload becomes bottleneck, evaluate cloud storage sync (Dropbox) or CI automation.
   
   **Planned Module Structure (Post-Extraction):**
   
   | Module | Visibility | Distribution | Sync |
   |---|---|---|---|
   | **World Setup Tools** | Public | Foundry Registry | Auto-update via manifest |
   | **Character Creation Tools** | Public | Foundry Registry | Auto-update via manifest |
   | **SWADE Fantasy World Kit** | Private | Manual only | Manual zip-upload to Molten |
   
   **Why extractable:** Character Creation Tools only references compendiums users already have installed (no premium content bundled), making it safe for public distribution.
   - Output: README section with procedures, safety checklist, and decision tree for full vs. packs-only sync.

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

5. **Foundry-default-icon variants of existing compendiums/functions/macros** — Add a parallel option to use Foundry's bundled default icon library (`icons/skills`, `icons/magic`, `icons/weapons`, etc.) as an alternative to the game-icons.net SVG set the module's compendiums, icon remapping, and macros currently use everywhere else.
   - Addresses: The actions-fantasy compendium rework (v0.7.x actions reorganization) proved the default Foundry webp art looks great and needs no external asset licensing, but the rest of the module (ancestries, gear, weapons, edges, hindrances, etc. and the icon remapping/mapping-generation tooling) is built entirely around game-icons.net SVGs. This is additive, not a replacement — existing game-icons.net work should not be undone.
   - Approach: TBD — likely needs a per-item alternate-icon mapping (similar in spirit to `scripts/lib/icon-mappings.js`) plus a toggle/setting or separate preset so GMs can pick which icon set they want, rather than forking every compendium outright.
   - Files (likely): `scripts/lib/icon-mappings.js` (or a new sibling mapping file), icon remapping FormApplication/macro, relevant compendium source/build steps once a JSON-source pipeline exists for packs.
   - Prerequisite: None strictly, but easier once there's a real JSON-source-of-truth pipeline for compendium packs (see Compendium Generation Tool item above) rather than hand-editing LevelDB via macros.
   - Output: GMs can choose between game-icons.net SVG styling and Foundry's default bundled art across the whole module, not just the actions compendium.

### Cleanup and Maintenance

- **v0.7.0+: Cleanup Release** — Remove legacy migration function and flags, legacy constants, and old setting compatibility scaffolding. Scheduled after stabilization window.
- **v1.6.0+: BaselineModulesManager ApplicationV2 Migration** (⏸️ deferred to v16 era) — Migrate from deprecated V1 FormApplication to V2 ApplicationV2 when Foundry v16 approaches. See [docs/APPLICATIONV2_MIGRATION.md](docs/APPLICATIONV2_MIGRATION.md) for detailed migration plan. Currently deferred: FormApplication works reliably; V2 complexity not justified while v16 is years away.

### Post-Roadmap Modularization (Parked)

- Status: Parked until current roadmap items are completed or explicitly removed.
- Timing: Phase 1 (in-repo organization) is scheduled as part of v0.5.x work. Phase 2 (full module extraction) is planned for after v0.5.x stabilizes (v0.6.x or later).
- Goal: extract world setup tools into a system-agnostic dependency module while keeping SWADE hub module focused on Fantasy compendium curation.

### Future: Extract Fantasy Content Packs to a Standalone Module (Parked)

- Status: Parked/future intent, not yet started. Character Manager's Gear tab work (v0.6.x) took an interim step toward this: `additionalAncestryPacks` / `additionalSkillPacks` / `additionalEdgePacks` / `additionalHindrancePacks` / `additionalGearPacks` world settings (see `scripts/settings.js`, consumed in `scripts/apps/character-creation/lib/compendium-utils.js`) let a GM merge in packs from other modules/homebrew *alongside* the built-in `FANTASY_PACKS` — but that's an interim additive step, not the end state (see below).
- Goal: eventually the Fantasy setting content (ancestries, skills, edges, hindrances, gear, weapons, armor, etc.) ships as its own standalone module rather than being bundled into this hub module. At that point Character Manager's compendium sourcing should have **no baked-in default pack for any data type** — SWADE is a genuinely generic system rulebook used to run many different settings (fantasy is only one), so a hub module built around it shouldn't hardcode "Fantasy" as the assumed/fallback source the way `FANTASY_PACKS` does today.
- What "no baked-in default" means concretely: per data type (ancestries, skills, edges, hindrances, gear/weapons/armor), the GM explicitly configures which pack(s) feed that category — via full settings, not just an additive list layered on a permanent default. The now-external Fantasy pack module becomes just one selectable option among others (a homebrew set, a different official setting's packs, etc.), never the thing Character Manager silently falls back to. A first-run setup flow (or sensible per-world defaulting to whatever's installed) may still be needed so the tool isn't blank out of the box — that's a UX question to work out at implementation time, not a reason to keep a hardcoded pack ID in the code.
- Why this matters for Character Manager specifically: the current additive settings should be designed so this migration doesn't require reworking the merge logic — they already treat `FANTASY_PACKS` as "today's defaults," not "the only possible source." The migration itself is: replace the hardcoded `FANTASY_PACKS` constant with GM-configured per-category pack selections, and fold the existing "additional packs" settings into that same configuration surface (they become redundant once every category is fully configurable rather than default-plus-additions).
- Prerequisite: None strictly, but natural to revisit alongside the World Setup Tools extraction above, since both are "pull hub-module content out into its own package" efforts.

#### Target Architecture

**Module 1: SWADE Fantasy World Kit (Hub)**
- Curated compendiums: Fantasy setting only (curated from SWADE Core Rules + Fantasy Companion).
- Controlled visibility: pack allowlisting and GM override.
- Icon remapping tools: utility macro and FormApplication for remapping icons across world items, actors, and unlocked compendiums.
- Simple character creation tools: skill calculator, edges/hindrances UI (minimal—no prerequisite checking), integrated with Fantasy compendium set.

**Module 2: World Setup Tools (System Agnostic)**
- Preset/dependency engine and manager UI.
- Used by: SWADE hub module and any other system module that needs preset management.
- No Foundry system/module dependencies beyond core Foundry APIs.

**Module 3: Character Creation Tools (System Agnostic, SWADE-focused UI)**
- Skill calculator, edges/hindrances selector, ancestry picker, and guided advancement automation.
- Reads from compendiums user has installed (no bundled content).
- Safe for public distribution (no premium content; only uses what users already own).
- Dependency: World Setup Tools (for preset/dependency infrastructure, if applicable).
- Can be used independently or integrated with SWADE hub module.

#### Future: Compendium Generation from Official Sources

Instead of shipping curated compendium packs, the long-term direction is to make this module a tool for creating, exporting, and rebuilding compendium content from installed official SWADE modules.

Once the Fantasy module is stable, consider evolving this into a more general recipe-based workflow that:
- Exports a user-created compendium from the Foundry UI as a minimal portable format
- Applies icon remapping and metadata normalization as part of the export/import flow
- Rebuilds the selection in another world from the same official source packs

This approach avoids shipping proprietary content, reduces repository risk, and preserves the ability to create campaign-specific custom compendiums on-demand.
#### Planned Extraction Scope

1. World Setup Tools module:
   - `scripts/lib/preset-utils.js` (extract)
   - `scripts/lib/dependencies.js` (extract)
   - `scripts/apps/BaselineModulesManager.js` (extract with renaming)
   - `templates/baseline-modules.hbs` (extract with renaming)
   - Relevant CSS classes from `styles/module.css` (extract)
   - Preset-specific settings keys (migrate/create in new module)

2. Character Creation Tools module:
   - `scripts/apps/character-creation/` (extract)
   - `templates/character-*.hbs` (extract)
   - Character creation settings and compendium integration logic

3. SWADE Hub module (keep and enhance):
   - Curated compendiums: maintain Fantasy setting focus with enhanced icon remapping and character creation tools.
   - Controlled visibility: GM-configurable pack allowlisting with player filtering.
   - Compendium integration: unified visibility filtering for sidebar and Quick Insert.
   - Integrate with Character Creation Tools module as optional companion.

#### Guardrails Before Starting Extraction

- Complete and stabilize Near Term and Mid Term roadmap work.
- Keep preset apply behavior as an unchanged core contract during extraction and handoff.
- Preserve SWADE hub module ownership of curated compendiums and controlled visibility.
- Preserve setting key compatibility with migrations during transition windows.
- Ensure World Setup Tools module is testable independently of SWADE system or content.
- Ensure Character Creation Tools only references compendiums (never bundles content), allowing public distribution.
- Design Character Creation Tools to work standalone or integrate cleanly with hub (no hard coupling to hub settings).
- Support attributes/skills above d12: SWADE raises a die past d12 via a flat modifier (d12+1, d12+2, ...) rather than a new die type. Character Manager's Traits tab only models d4–d12 today (die-step buttons, no modifier), so any character advancing past d12 in play can't be represented — acceptable as a personal-use gap for now, but a real rule gap for a public tool other GMs' campaigns will hit. Must be added before this tool is split out as a standalone public module.

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
      (organize here; ready for Phase 2 extraction)
    ExtraVisiblePacksSelector.js (stays here; compendium visibility)
  (other non-preset files stay at scripts/ root)
templates/
  world-setup-tools/
    baseline-modules.hbs (moved from templates/)
  character-creation/
    (organize here; ready for Phase 2 extraction)
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
4. Create separate `foundry-character-creation-tools` repository.
5. Move `scripts/apps/character-creation/` and associated templates/styles.
6. Create new `module.json` for Character Creation Tools module.
7. Update SWADE hub module to declare both as optional dependencies and import from them.
8. Maintain compatibility shims for settings migration during transition window.

#### Workflow and Dependencies

- Phase 1 (in-repo): Organize into separate code folders in this repo. Single Copilot session.
- Phase 2 onwards: Extract into three separate repos (SWADE hub, World Setup Tools, Character Creation Tools). Use one VS Code multi-root workspace for all three to maintain single Copilot session.
- Dependency flow: SWADE hub optionally depends on both World Setup Tools and Character Creation Tools. Character Creation Tools is independent (works solo or integrated with hub).
- SWADE hub can ship without Character Creation Tools; users optionally install it as a companion.

---

## Known Quirks

### LevelDB compendium edits can silently fail to commit

Compendium packs (`packs/*/`) are LevelDB databases. Foundry buffers new/edited items in a numbered write-ahead-log file (e.g. `000876.log`) and only periodically compacts that data into a numbered `.ldb` SST file. `.gitignore` excludes `packs/**/*.log` (intended for Foundry's transient `LOG`/`LOG.old` debug logs), but the glob also matches these numbered WAL files.

If you `git add`/commit a pack before Foundry has compacted your edits into a `.ldb` file, the commit only captures metadata churn (`CURRENT`, `MANIFEST-*`) — the actual item data sitting in the ignored `.log` file is silently dropped and never reaches GitHub. `git show <commit> --stat -- packs/<pack-name>` will look "successful" (files changed) while containing zero real content changes.

**Before committing pack changes:**
1. Fully close the local Foundry instance (forces LevelDB to flush/compact pending writes).
2. Reopen and close again if a `.log` file for that pack is still non-zero.
3. Check `git status` — you want to see the `.ldb` file itself listed as modified/untracked, not just `CURRENT`/`MANIFEST-*`.
4. Optionally sanity-check item counts before pushing, e.g.:
   ```bash
   grep -a -o '"name":"[^"]*"' packs/<pack>/<tracked-ldb> | sort -u | wc -l
   ```
   and compare against the current on-disk `.ldb`.
5. Bump `module.json` version after confirming the real diff, so hosted instances (e.g. Molten) pick up the update.

---

## Notes for Contributors

- Prefer small, behavior-preserving edits.
- Keep public settings keys stable unless migration is included.
- Treat preset apply behavior as a core contract: preset is authoritative.
- Validate in Foundry after refactors even when static diagnostics are clean.
- When proposing features or refactors, critically question: what problem does this solve? Can users achieve the same goal another way with less complexity? Be willing to suggest simplifications or deprioritizations if the underlying need is unclear.
