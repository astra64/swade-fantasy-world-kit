# Character Manager v0.6.0 Implementation Roadmap

**Status:** Character Creation & Editing In Progress | Concept, Ancestry, Hindrances, Traits, Edges, Gear Tabs Complete — Gear tab not yet tested in-Foundry (implemented but unverified)

## Overview

Character Manager v0.6.0 is a unified character creation and advancement tool for SWADE (Savage Worlds Adventure Edition) in Foundry VTT v14. Unlike the previous tab-based creator, this version follows the official character creation sequence from the rulebook and supports mid-campaign editing/advancement in a single interface (similar to Pathbuilder for PF2e).

**Key Distinction:** Character Manager always opens from an actor sheet and works whether that actor is blank or already has data. Creation and editing were originally planned as two phases (MVP first, then a later pass to detect/prepopulate from an existing actor), but that split didn't hold up in practice: prepopulation for each field was built as part of building that field's tab, not deferred to a separate pass afterward. Every tab now prepopulates from an existing actor (Concept, Ancestry, Attributes, Skills, Edges, Hindrances). The only piece still genuinely deferred is **Save** (writing changes back to the actor), which is scoped to the Summary tab regardless of phase — see Known Blockers and Milestone 6 below. Advancement (post-creation XP spend) remains a distinct second phase, since it's mechanically different work, not just "the same detection logic applied later."

---

## Architecture & Implementation Notes

### Component-Based Design
To maintain scalability as more tabs are added, the Character Manager uses a modular architecture:

- **Tab Handlers** (`handlers/AncestryTabHandler.js`, `handlers/ConceptTabHandler.js`): Each tab has a dedicated handler managing its specific logic (event binding, data updates, validation)
- **Reusable Components** (`components/SearchableDropdown.js`, `DragDropManager.js`, `TabManager.js`): Common UI patterns extracted for reuse across tabs
- **Collapsible Item Partial** (`_collapsible-item.hbs`): Template partial for displaying expandable items (ancestry, abilities, hindrances) consistently
- **Constants** (`constants.js`): Centralized configuration (tab guidance, budgets, mappings, compendium pack IDs)
- **Calculator Utilities** (`lib/calculator.js`): Pure functions for rule calculations without UI dependencies

**Benefit:** Adding a new tab (e.g., Hindrances) only requires:
1. Create `HindrancesTabHandler.js`
2. Create tab partial `_hindrances.hbs` (or reuse collapsible items)
3. Add handler to `CharacterManager.js` tab handlers list
4. Update template to reference new tab

### Text Enrichment
Ancestry and item descriptions use Foundry's `TextEditor.enrichHTML()` to process embedded content links (`@UUID[...]` syntax), converting them to clickable links that open items in new windows.

---

### Phase 1: Character Creation & Editing
Opens from actor sheet; works identically whether the actor is blank (creation) or already has data (editing). `getData()` reads Name, Archetype, Concept (`system.details.notes`), Ancestry, Attributes, Skills, Edges, and Hindrances off an existing actor on open — Skills/Edges/Hindrances are detected from `actor.itemTypes.skill/edge/hindrance` (embedded Items, matched to compendium entries by name), not from `actor.system.skills/edges/hindrances` (a schema SWADE doesn't actually use for these). **Save is still a scaffold**: `_createActor()`'s Save button exists so individual tabs are testable in isolation as they're built, but real persistence for all fields is intentionally deferred to the Summary tab (Milestone 3, Tab 8), not something to patch mid-tab-development. See Milestone 6 for the remaining prepopulation/detection gaps and the Save follow-up.

### Phase 2: Character Advances & Planning
Add ability to plan and manage character advancement progression (same tool or separate, TBD).

---

## Design Specifications

### Tab Order (Official SWADE Rules Flow)
1. **Concept** — Archetype + Concept text fields
2. **Ancestry** — Single select (auto-applies bonuses)
3. **Hindrances** — Up to 4 points with trade-off dropdowns (Major/Minor labeled)
4. **Attributes** — 5 points to distribute (ancestry bonuses lock minimums)
5. **Skills** — 12 points + bonuses from hindrances
6. **Edges** — Select from available (spends edge points from hindrances)
7. **Gear** — Drag-drop items from compendiums, 300 silver budget
8. **Summary** — Final review with Pace, Parry, Toughness calculations

### Budget Tracking (Sticky Footer)
- **Always Visible:** Attribute Points (X/5), Skill Points (Y/12), Edge Points (Z/?)
- **Gear Tab Only:** Total Cost (X/300 silver)
- **Summary Tab Only:** Gear Cost + final derived stats
- **Over-Budget Behavior:** Allowed with red highlighting, never blocked

### Data Storage
- Store raw selections (Ancestry, Hindrances, trait choices)
- Actor sheet derives calculated values automatically
- Primary save: Update actor data directly
- Secondary: JSON export/import (if practical)

### Key Interactions
- **Hindrances Trade-Offs:** Dropdown per point → auto-undoes previous selection
- **Ancestry Bonuses:** Auto-applied, locked minimums (e.g., d6 Vigor minimum), message at top of Attributes tab
- **Skill Modifiers:** Display as "+X modifier" text at end of skill rows (from edges/hindrances)
- **Edge Prerequisites:** Info-only (no blocking), displayed next to edge name
- **Gear:** Drag-drop from compendiums, individual costs shown, duplicates allowed
- **Validation:** Warning popup on save if invalid states detected (over-budget, missing mandatory fields, etc.)

---

## Implementation Milestones

**Note:** Milestones 1-6 all build **Phase 1** (Character Creation & Editing) — prepopulation/detection (originally planned as a separate later pass in Milestone 6) shipped incrementally as each tab was built instead, so Milestone 6 now just tracks the remaining detection gaps (Gear) and the Save follow-up. **Phase 2** (Advances) scope TBD.

---

### Milestone 1: Foundation & Data Layer
**Applies to:** Phase 1 (Character Creation & Editing)

- [ ] **calculator.js Updates**
  - [ ] Add hindrance trade-off calculation functions
  - [ ] Add edge point calculation (base + ancestry bonuses like Human)
  - [ ] Add gear cost tracking
  - [ ] Add derived stats for gear (Pace from hindrances, Armor bonus tracking)
  - [ ] Document skill modifier stacking rules

- [ ] **compendium-utils.js Updates**
  - [ ] Add getHindrances() with Major/Minor type data
  - [ ] Add getEdges() with prerequisite data
  - [ ] Add getGear() with cost data
  - [ ] Ensure alphabetical sorting maintained

- [ ] **Data Structure Definition**
  - [ ] Character object schema (raw selections only)
  - [ ] Hindrances trade-off tracking structure
  - [ ] Ancestry bonus application rules

**Estimated Scope:** 400+ lines (calculator/utils)

---

### Milestone 2: UI Scaffold (Main App & Templates)
**Applies to:** Phase 1 (Character Creation & Editing)

- [ ] **CharacterManager.js (Main FormApplication)**
  - [ ] Constructor: Accept actor, initialize from existing data
  - [ ] getData(): Fetch all compendium data, calculate budgets, prepare template context
  - [ ] activateListeners(): Setup tab system, auto-save handlers
  - [ ] _setupTabs(), _switchTab(): Tab navigation
  - [ ] _saveCharacterToActor(): Persist changes to actor
  - [ ] _validateCharacter(): Check for invalid states

- [ ] **UI Templates & Styling**
  - [ ] character-manager.hbs (main template with 8 tabs, footer, buttons)
  - [ ] _concept.hbs through _summary.hbs (individual tab templates)
  - [ ] character-manager.css (base layout, budget tracker, responsive design)

- [ ] **character-manager.hbs (Main Template)**
  - [ ] Tab navigation bar
  - [ ] Tab content containers (initially placeholders)
  - [ ] Sticky footer with budget tracker
  - [ ] Action buttons (Save, Export JSON, Cancel)

- [ ] **Individual Tab Templates (_concept.hbs through _summary.hbs)**
  - [ ] Each tab template includes new player-friendly guidance text (see per-tab specs in Milestone 3 below)
  - [ ] Guidance is shown prominently at top of each tab
  - [ ] Clear, conversational tone explaining what the tab does and what choices matter

- [ ] **styles/character-manager.css**
  - [ ] Base layout (tabs, footer, buttons)
  - [ ] Budget tracker styling (red over-limit states)
  - [ ] Guidance text styling (boxed, distinguished from form elements)
  - [ ] Responsive design for mobile
  - [ ] Tab transitions/animations

**Estimated Lines of Code:** 400-500 (CharacterManager.js), 100-150 (main template), 100-150 (guidance text across tab templates), 300-400 (CSS)

---

### Milestone 3: Tab-by-Tab Implementation (All 8 Tabs)
**Applies to:** Phase 1 (Character Creation & Editing)

#### Tab 1: Concept
- [x] Archetype text input (freeform)
- [x] Concept textarea (freeform)
- [x] Auto-save on change
- [x] **New Player Guidance:**

#### Tab 2: Ancestry
- [x] Single select dropdown from compendiums
- [x] Display ancestry bonuses (ancestral abilities) as collapsible items
- [x] Collapsible display of selected ancestry with description
- [x] Edit button to open ancestry item from source
- [x] Show "Ancestral Abilities" section with granted items
- [x] Each ability shows as collapsible item with image and description
- [x] On selection: Auto-apply bonuses to Attributes tab
- [x] Show message: "Ancestry bonuses applied: ..."
- [x] **New Player Guidance:**
  > "Pick your character's ancestry (like Human, Dwarf, Elf). Each ancestry gives you starting bonuses to skills and stats. The bonuses automatically apply to later tabs—don't worry about adding them yourself."
- [x] **Validation:** Inform only if not selected

#### Tab 3: Hindrances
- [x] List of hindrances from compendium (Major/Minor labeled)
- [x] Multi-select checkboxes (up to 4 points)
- [x] For each hindrance: Dropdown for trade-off
  - Options: Raise Attribute (2 pts), Edge (2 pts), Skill Point (1 pt), Extra Funds (1 pt)
  - Major hindrances can show 2 dropdowns if using 1-point trade-offs
- [x] Points tracking: Show X/4 total
- [x] On dropdown change: Auto-undo previous, recalculate budgets
- [x] **New Player Guidance:**
  > "Hindrances are flaws or quirks that give you bonus points. Major hindrances are worth 2 points, minor ones worth 1. Pick up to 4 points' worth. For each, choose what bonus you want: a +2 to an attribute, a free edge, extra skill point, or extra money. First-timers should pick 2–3 hindrances to keep things simple."
- [x] **Validation:** None

**Estimated Lines:** 200-300 (template + handler)

#### Tab 4: Attributes & Skills

**Layout:** Single unified view grouping skills under their linked attributes (Agility, Smarts, Spirit, Strength, Vigor).

- [x] Investigate adding trait info - either in collapsable or hover text

**Attributes Section:**
- [x] For each attribute: Die button group [d4 d6 d8 d10 d12] with active state
- [x] Show ancestry bonus message if applied (e.g., "Vigor +1 from ancestry")
- [x] Lock minimums if ancestry bonus present (e.g., d6 Vigor locked to d6+)

**Skills Section (grouped under each attribute):**
- [ ] Each skill: Name, die buttons [d4 d6 d8 d10 d12], modifier display (+X text)
- [x] Core skills (Athletics, Common Knowledge, Notice, Persuasion, Stealth): marked with star icon, free at d4
- [x] Non-core skills cost points to use

**Real-time Tracking:**
- [x] Integrate with pinned footer showing: Attributes: X/5 and Skills: Y/12
- [x] Warn if either exceeds budget

**New Player Guidance:**
- **For Attributes:** "You have 5 points to boost your core abilities. Start with d6 in each (your base), then pick which ones matter most to your character. A strong warrior bumps Strength and Vigor; a sneaky rogue boosts Agility and Smarts. Moving a die up one step (d6→d8) costs 1 point. Raising from d12 costs 2 points but has a limit—ask your GM if unsure."
- **For Skills:** "Pick what your character is good at. You have 12 points to spend. Core skills (marked FREE) start at d4—you just pay to boost them higher. Other skills cost points to use. Each die step up (d4→d6) costs 1 point. Pro tip: Pick 3–4 skills your character uses often; leave the rest. Your ancestry and edges might add free bonuses here too."

**Validation:**
- [x] Warn if over 5 attribute points
- [x] Warn if over 12 skill points (excluding hindrance bonuses)
- [x] Lock changes if ancestry bonus locked a minimum

**Estimated Lines:** 350-500 (template + handler)

#### Tab 5: Edges
- [x] Edge cards from compendium (search dropdown + drag-drop, same pattern as Hindrances)
- [x] Multi-select (spends edge points from hindrance perk allocations)
- [x] Show prerequisite info (non-blocking, info-only) — pulled from SWADE's `system.requirements` via each requirement's built-in `toString()`
- [ ] Show edge cost if available (deferred — edges don't have a "cost" field in this ruleset; only prerequisites)
- [x] Real-time edge point tracking: X/Y in footer and above the selected-edges list
- [x] **New Player Guidance:** (uses existing `TAB_GUIDANCE.edges` text)
- [x] **Validation:** Non-blocking warning toast if adding an edge exceeds available edge points; footer turns red when over budget
- [x] **Ancestry-granted bonus edges** (e.g., Human's "Adaptable"): `calculateAncestryBonusEdgePoints()` scans the selected ancestry's granted child items and adds 1 edge point per match against the `bonusEdgePointAbilityNames` world setting (default: "Adaptable"), matched as a whole word/segment so it works regardless of item naming convention (e.g. `"Humans-Adaptable"`) — deliberately name-based, not a compendium-specific Active Effect tag, so any installed setting's Human-equivalent ancestry is covered without per-compendium edits
- [x] **Granted child items display:** Edges (and Hindrances) that themselves grant further edges/hindrances (e.g. Arcane Background) show a collapsible "Granted by X" section, same pattern as Ancestry's ancestral abilities

**Estimated Lines:** 150-200 (template + handler)

#### Tab 6: Gear
- [x] Drag-drop zone for items from compendiums (gear, weapons, armor & shields — same search dropdown + drag-drop pattern as Edges/Hindrances)
- [x] List items with individual cost, quantity (+/- controls), running total — duplicates allowed by design (picking the same item again just bumps quantity instead of adding a second card)
- [x] Show remaining budget, displayed in the sticky footer while on the Gear tab. Budget is **not** the original spec's hardcoded 300 — it reads SWADE's native `pcStartingCurrency` world setting (doubled, per SWADE's own starting-funds convention), so it tracks whatever a GM has that set to for their table.
- [x] Remove item button
- [x] **New Player Guidance:** (uses existing `TAB_GUIDANCE.gear` text)
- [x] **Validation:** Non-blocking; footer budget value turns red when over budget (no hard block, consistent with Edges/Hindrances)
- [x] **Min-Strength warning:** items with a `system.minStr` value (weapons and armor) show an inline "Requires Strength dX to use without penalty" hint, in `warning-text` red when the character's current Strength die is below it, plus a toast on add. Informational only — SWADE's actual penalty is a -1 die step on the relevant roll, not "can't use," so this never blocks adding the item.
- [x] Save button now appears on every tab, not just Gear/Summary — see "Save button & unspent-points confirmation" below.

**Not yet done:** Weight/encumbrance tracking (not in original spec — only silver cost is budgeted)

**Estimated Lines:** 150-200 (template + handler)

#### Tab 7: Summary
- [ ] Display all character selections in read-only format
- [ ] Calculate and show:
  - Final Pace (base 6 + modifications from hindrances/ancestry)
  - Parry (2 + Fighting/2)
  - Toughness (2 + Vigor/2 + Armor bonus)
- [ ] Show gear cost breakdown
- [ ] **New Player Guidance:**
  > "Here's your final character. Review everything—if something looks off, go back to earlier tabs and fix it. The derived stats at the bottom (Pace, Parry, Toughness) are calculated automatically from your choices. Ready? Hit Save to add your character to the world!"
- [ ] **Validation:** List all invalid states if any

**Estimated Lines:** 100-150 (template + handler)

**Total Milestone 3:** ~1600-1900 lines of code

---

### Milestone 4: Integration & Polish
**Applies to:** Phase 1 (Character Creation & Editing)

- [ ] **main.js Integration**
  - [ ] Import CharacterManager
  - [ ] Register any new Handlebars helpers needed
  - [ ] Add menu item to open Character Manager from actor sheet
  - [ ] Expose window.CharacterManager for console access

- [ ] **Macro Creation**
  - [ ] CHARACTER_MANAGER_MACRO.js (open from hotbar, auto-select actor)

- [ ] **CSS Refinement**
  - [ ] Polish colors, spacing, typography
  - [ ] Test responsive behavior
  - [ ] Add smooth transitions/animations

- [ ] **Documentation**
  - [ ] CHARACTER_MANAGER_QUICKSTART.md
  - [ ] In-app tooltips (if time allows)

**Estimated Scope:** 100-200 lines (main.js + macros)

---

### Milestone 5: Testing & QA
**Applies to:** Phase 1 (Character Creation & Editing)

- [ ] **Functional Testing**
  - [ ] Tab navigation works
  - [ ] Data persists across tab switches
  - [ ] Budget calculations accurate
  - [ ] Over-budget warnings display correctly
  - [ ] Ancestry bonuses applied correctly
  - [ ] Hindrance trade-offs work
  - [ ] Gear drag-drop functional
  - [ ] Save to blank actor works
  - [ ] No prepopulation issues (starting fresh)

- [ ] **Rules Compliance Testing**
  - [ ] Attribute point budgets enforced (5 max)
  - [ ] Skill point budgets enforced (12 + hindrances)
  - [ ] Edge point budgets enforced
  - [ ] Gear budget enforced (300 silver)
  - [ ] Derived stats calculate correctly
  - [ ] Skill costs follow rules (1pt up to attribute, 2pts above)

- [ ] **Edge Case Testing**
  - [ ] Ancestry bonuses with multiple attributes
  - [x] Human ancestry with bonus edges (name-matched via `bonusEdgePointAbilityNames`, tested with "Humans-Adaptable")
  - [ ] Configure bonus edge string in settings
  - [ ] Over-spec'd characters (handled gracefully)
  - [ ] Empty character state
  - [ ] Multiple saves (no data loss)

---

### Milestone 6: Full Editing & Prepopulation
**Applies to:** Phase 1 (Character Creation & Editing)

- [ ] **CharacterManager.js Updates**
  - [x] `getData()` detects and prepopulates Name, Archetype, Concept, Ancestry, and Attributes from an existing actor
  - [x] Detection extended to Skills, Edges, Hindrances via `_detectSkillsFromActor()` / `_detectEdgesFromActor()` / `_detectHindrancesFromActor()` — read from `actor.itemTypes.skill/edge/hindrance` (embedded Items), matched to compendium entries by name (no `compendiumUuid` flag exists yet for these three since real save hasn't landed — see Note below)
  - [ ] Add change detection: Highlight which fields have been modified since open
  - [ ] Add validation for mid-edit states (e.g., character with advances)

- [ ] **Data Detection Logic**
  - [x] Ancestry detection from actor items
  - [x] Hindrances/edges detection from actor Items (`actor.itemTypes.hindrance` / `actor.itemTypes.edge`)
  - [x] Attribute values extraction from actor system data
  - [x] Skill values extraction from actor Items (`actor.itemTypes.skill`)
  - [x] Gear detection from actor inventory (`_detectGearFromActor()` — reads `gear`/`weapon`/`armor`/`shield` type Items, matched to the gear/weapons/armor compendiums by name, same fallback pattern as Edges/Hindrances)

**Note:** Prepopulation (read side) for Skills/Edges/Hindrances is now implemented per-tab, ahead of Save (write side) as originally planned — reads work by matching item names against the compendium, same fallback pattern Ancestry already used. Save (`_createActor()`) still writes Skills/Edges/Hindrances as raw `system.skills`/`system.edges`/`system.hindrances` data rather than real embedded Items (a scaffold gap, since SWADE actually reads these from `actor.itemTypes.*`, not that schema) — this is the one piece still deferred to the Summary tab. Gear is the exception: `_saveGearToActor()` (added with the Gear tab) already creates real embedded Items with the `compendiumUuid` flag, same pattern as Ancestry, so it isn't blocked on Summary landing.

**Estimated Scope:** 200-300 lines (detection + prepopulation logic)

---

## Known Blockers & Dependencies

### Critical
- **Ancestry Data:** Requires metadata for:
  - Attribute bonuses (e.g., "d6 Vigor instead of d4") — done, read from Active Effect `changes` on the ancestry/child items
  - Edge bonuses (e.g., "Humans get 1 bonus edge") — done, via name-matching against the `bonusEdgePointAbilityNames` setting rather than metadata (see Tab 5: Edges above)
  - Skill bonuses (if any)
  - Pace modifications (if any)
- **Hindrance Data:** Requires Major/Minor type flags
- **Edge Data:** Requires prerequisite metadata
- **Gear Data:** Requires cost field

### Nice-to-Have (Deferred to v0.6.3+)
- Hardcoded skill→attribute mapping → Read from item metadata
- Edge prerequisite enforcement → Nice UI warnings already planned
- Ancestry-specific attribute caps (e.g., "d12+1 Vigor") → Basic support via metadata
- Skill grouping optimization → Start flat, optimize if testing shows need

---

## Cross-Tab Enhancements (added during Gear tab work, not tab-specific)

### Save Button & Unspent-Points Confirmation
- The footer's Save/Cancel buttons now show on every tab, not just Gear/Summary — needed since Summary doesn't exist yet and Save was otherwise unreachable in the running app.
- Clicking Save now checks for unspent Attribute/Skill/Edge points first. If any exist, a blocking `Dialog.confirm` ("This character still has unspent X. Save anyway?") must be explicitly confirmed before `_createActor()` runs. Cancelling the dialog (or the confirm returning anything but `true`) aborts the save.
- Deliberately **not** checked: leftover Hindrance points or unspent gear silver — neither is really a "mistake" the way an unspent creation point usually is (fewer hindrances or not spending every coin is a valid choice).
- Implementation: `CharacterManager._confirmUnspentPoints()`, reading a `this._budgetSnapshot` cached at the end of the last `getData()` call (cheaper than recomputing edge points, which depend on async ancestry child-item data).

### Configurable Additional Compendium Packs
- Five new world settings (`additionalAncestryPacks`, `additionalSkillPacks`, `additionalEdgePacks`, `additionalHindrancePacks`, `additionalGearPacks` in `scripts/settings.js`) let a GM merge in packs from other modules/homebrew alongside the built-in Fantasy packs — comma/semicolon/whitespace-separated pack IDs, same parsing convention as `extraVisiblePacks`.
- This is additive only: it does **not** replace `FANTASY_PACKS` in `compendium-utils.js`. A future full override/replacement model (letting a GM point Character Manager at a different setting's compendiums entirely, or the standalone-module extraction noted in DEVELOPMENT.md) is a separate, bigger piece of work, not yet started.

---

## Testing Checklist (v0.6.2)

See [TESTING_CHECKLIST_v0.6.2.md](TESTING_CHECKLIST_v0.6.2.md) for comprehensive test cases.

Key test categories:
- UI Navigation (8 tests)
- Budget Tracking (3 tests)
- Data Persistence (2 tests)
- Rules Compliance (4 tests)
- Edge Cases (3 tests)
- JSON Export/Import (1 test)
- Integration (macro access) (1 test)

**Total Tests:** 22-25

---

## File Structure

```
scripts/apps/character-creation/
├── lib/
│   ├── calculator.js (UPDATED)
│   ├── compendium-utils.js (UPDATED)
├── CharacterManager.js (NEW - main FormApplication)
├── index.js (UPDATED - export CharacterManager)

templates/character-creation/
├── character-manager.hbs (NEW - main template)
├── _concept.hbs (NEW - concept tab)
├── _ancestry.hbs (NEW - ancestry tab)
├── _hindrances.hbs (NEW - hindrances tab)
├── _attributes.hbs (NEW - attributes tab)
├── _skills.hbs (NEW - skills tab)
├── _edges.hbs (NEW - edges tab)
├── _gear.hbs (NEW - gear tab)
├── _summary.hbs (NEW - summary tab)

styles/
├── character-manager.css (NEW - all styling)

source/macros/
├── CHARACTER_MANAGER_MACRO.js (NEW)

Root:
├── CHARACTER_MANAGER_v0.6.2_ROADMAP.md (this file)
├── CHARACTER_MANAGER_QUICKSTART.md (NEW - user guide)
├── TESTING_CHECKLIST_v0.6.2.md (UPDATED - aligned with new design)
```

---

## Success Criteria

**v0.6.2 Release Ready When:**
1. ✅ All 8 tabs implemented and functional
2. ✅ Budget tracking accurate across all tabs
3. ✅ Ancestry bonuses auto-applied correctly
4. ✅ Hindrance trade-off system working
5. ✅ Gear drag-drop functional
6. ✅ Save to actor working
7. ✅ All 22-25 tests passing
8. ✅ No console errors in Foundry v14
9. ✅ Documentation complete

---

## Estimated Timeline

| Build Stage | Estimate | Status |
|-------|----------|--------|
| Foundation | 4-6 hours | Pending |
| UI Foundation | 4-6 hours | Pending |
| Tabs (8 tabs) | 8-12 hours | Pending |
| Integration | 2-3 hours | Pending |
| Testing | 3-5 hours | Pending |
| **Total** | **21-32 hours** | Pending |

---

## Notes

- This roadmap prioritizes clean separation of concerns (UI, data, calculation)
- Each tab is relatively independent, allowing parallel development if needed
- Testing should be iterative (test each tab as it's completed, not all at end)
- User feedback from v0.6.1 testing sessions should drive priority adjustments
