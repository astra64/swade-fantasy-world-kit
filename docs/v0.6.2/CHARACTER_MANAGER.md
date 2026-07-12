# Character Manager v0.6.2 Implementation Roadmap

**Status:** Design Locked | Ready for Implementation

## Overview

Character Manager v0.6.2 is a unified character creation and advancement tool for SWADE (Savage Worlds Adventure Edition) in Foundry VTT v14. Unlike the previous tab-based creator, this version follows the official character creation sequence from the rulebook and supports mid-campaign editing/advancement in a single interface (similar to Pathbuilder for PF2e).

**Key Distinction:** No separate "Create" vs "Edit" workflows. Users create a blank actor first, then open Character Manager from the actor sheet to populate/modify character data.

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

## Implementation Phases

### Phase 1: Foundation & Data Layer
**Goal:** Update data structures and calculator for new mechanics

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
  - [ ] Actor data mapping strategy

**Estimated Lines of Code:** 200-300 (calculator), 150-200 (compendium-utils)

---

### Phase 2: UI Foundation & Template Structure
**Goal:** Build core UI scaffolding

- [ ] **CharacterManager.js (Main FormApplication)**
  - [ ] Constructor: Accept actor, initialize from existing data
  - [ ] getData(): Fetch all compendium data, calculate budgets, prepare template context
  - [ ] activateListeners(): Setup tab system, auto-save handlers
  - [ ] _setupTabs(), _switchTab(): Tab navigation
  - [ ] _loadCharacterFromActor(): Populate form from existing actor
  - [ ] _saveCharacterToActor(): Persist changes to actor
  - [ ] _validateCharacter(): Check for invalid states

- [ ] **character-manager.hbs (Main Template)**
  - [ ] Tab navigation bar
  - [ ] Tab content containers (initially placeholders)
  - [ ] Sticky footer with budget tracker
  - [ ] Action buttons (Save, Export JSON, Cancel)

- [ ] **styles/character-manager.css**
  - [ ] Base layout (tabs, footer, buttons)
  - [ ] Budget tracker styling (red over-limit states)
  - [ ] Responsive design for mobile
  - [ ] Tab transitions/animations

**Estimated Lines of Code:** 400-500 (CharacterManager.js), 100-150 (template), 300-400 (CSS)

---

### Phase 3: Tab-by-Tab Implementation
**Goal:** Implement each tab with full interaction and validation

#### Tab 1: Concept
- [ ] Archetype text input (freeform)
- [ ] Concept textarea (freeform)
- [ ] Auto-save on change
- [ ] **Validation:** Optional (no blocking)

**Estimated Lines:** 50 (template + handler)

#### Tab 2: Ancestry
- [ ] Single select dropdown from compendiums
- [ ] Display ancestry bonuses (attributes, edges, skills, etc.)
- [ ] On selection: Auto-apply bonuses to Attributes tab
- [ ] Show message: "Ancestry bonuses applied: ..."
- [ ] **Validation:** Inform only if not selected

**Estimated Lines:** 100 (template + handler) + calculator updates

#### Tab 3: Hindrances
- [ ] List of hindrances from compendium (Major/Minor labeled)
- [ ] Multi-select checkboxes (up to 4 points)
- [ ] For each hindrance: Dropdown for trade-off
  - Options: Raise Attribute (2 pts), Edge (2 pts), Skill Point (1 pt), Extra Funds (1 pt)
  - Major hindrances can show 2 dropdowns if using 1-point trade-offs
- [ ] Points tracking: Show X/4 total
- [ ] On dropdown change: Auto-undo previous, recalculate budgets
- [ ] **Validation:** Warn if over 4 points, inform of unused points

**Estimated Lines:** 200-300 (template + handler)

#### Tab 4: Attributes
- [ ] 5 attribute sections (Agility, Smarts, Spirit, Strength, Vigor)
- [ ] Each attribute: Die button group [d4(?) d6 d8 d10 d12] with state indicators
- [ ] Show ancestry bonus message if applied
- [ ] Lock minimums if ancestry bonus (e.g., d6 Vigor locked to d6+)
- [ ] Real-time point tracking: X/5 in footer
- [ ] **Validation:** Warn if over 5 points

**Estimated Lines:** 150-200 (template + handler)

#### Tab 5: Skills
- [ ] Grouped by linked attribute OR flat list (TBD based on testing)
- [ ] Each skill: Name, die buttons [d4 d6 d8 d10 d12], modifier display (+X text)
- [ ] Core skills (Athletics, Common Knowledge, Notice, Persuasion, Stealth): ★ or bold, free at d4
- [ ] Search/filter box (optional, add if list gets long)
- [ ] Real-time point tracking: Y/12 in footer (+ hindrance bonus)
- [ ] **Validation:** Warn if over budget

**Estimated Lines:** 200-300 (template + handler)

#### Tab 6: Edges
- [ ] Edge cards from compendium
- [ ] Multi-select (spends edge points from hindrances)
- [ ] Show prerequisite info (non-blocking, info-only)
- [ ] Show edge cost if available
- [ ] Real-time edge point tracking: Z/? in footer
- [ ] **Validation:** Inform if prerequisites not met, warn if over edge points

**Estimated Lines:** 150-200 (template + handler)

#### Tab 7: Gear
- [ ] Drag-drop zone for items from compendiums
- [ ] List items with individual cost, quantity, running total
- [ ] Show remaining budget (300 - used)
- [ ] Remove item button
- [ ] **Validation:** Warn if over 300 silver budget

**Estimated Lines:** 150-200 (template + handler)

#### Tab 8: Summary
- [ ] Display all character selections in read-only format
- [ ] Calculate and show:
  - Final Pace (base 6 + modifications from hindrances/ancestry)
  - Parry (2 + Fighting/2)
  - Toughness (2 + Vigor/2 + Armor bonus)
- [ ] Show gear cost breakdown
- [ ] **Validation:** List all invalid states if any

**Estimated Lines:** 100-150 (template + handler)

**Total Phase 3:** ~1500-1800 lines of code

---

### Phase 4: Integration & Polish
**Goal:** Connect to main module, add access points

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

**Estimated Lines:** 100-200 (main.js + macros)

---

### Phase 5: Testing & QA
**Goal:** Comprehensive validation against SWADE rules

- [ ] **Functional Testing** (Per TESTING_CHECKLIST_v0.6.2.md, updated for new design)
  - [ ] Tab navigation works
  - [ ] Data persists across tab switches
  - [ ] Budget calculations accurate
  - [ ] Over-budget warnings display correctly
  - [ ] Ancestry bonuses applied correctly
  - [ ] Hindrance trade-offs work
  - [ ] Gear drag-drop functional
  - [ ] Save/load from actor works
  - [ ] JSON export/import works

- [ ] **Rules Compliance Testing**
  - [ ] Attribute point budgets enforced (5 max)
  - [ ] Skill point budgets enforced (12 + hindrances)
  - [ ] Edge point budgets enforced
  - [ ] Gear budget enforced (300 silver)
  - [ ] Derived stats calculate correctly
  - [ ] Skill costs follow rules (1pt up to attribute, 2pts above)

- [ ] **Edge Case Testing**
  - [ ] Ancestry bonuses with multiple attributes
  - [ ] Human ancestry with bonus edges
  - [ ] Over-spec'd characters (handled gracefully)
  - [ ] Characters with advances (warning shown)
  - [ ] Empty character state

- [ ] **Cross-Browser Testing** (Foundry in Chrome, Firefox, Safari if available)

---

## Known Blockers & Dependencies

### Critical
- **Ancestry Data:** Requires metadata for:
  - Attribute bonuses (e.g., "d6 Vigor instead of d4")
  - Edge bonuses (e.g., "Humans get 1 bonus edge")
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

| Phase | Estimate | Status |
|-------|----------|--------|
| Phase 1: Foundation | 4-6 hours | Pending |
| Phase 2: UI Foundation | 4-6 hours | Pending |
| Phase 3: Tabs (8 tabs) | 8-12 hours | Pending |
| Phase 4: Integration | 2-3 hours | Pending |
| Phase 5: Testing | 3-5 hours | Pending |
| **Total** | **21-32 hours** | Pending |

---

## Notes

- This roadmap prioritizes clean separation of concerns (UI, data, calculation)
- Each tab is relatively independent, allowing parallel development if needed
- Testing should be iterative (test each tab as it's completed, not all at end)
- User feedback from v0.6.1 testing sessions should drive priority adjustments
