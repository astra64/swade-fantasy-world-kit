# Development Tools

This document describes the development utilities included in this repository. These tools are **not part of the module runtime** and are used for compendium analysis, icon mapping generation, and maintenance.

## Overview

Development tools are located in `scripts/dev/` and support the icon mapping workflow for v0.5.6+.

---

## Compendium Data Extraction

### `scripts/dev/extract-compendium-data.js`

Extracts item names and icon paths from all fantasy compendiums using the Foundry macro system.

**Why separate tool:** Accesses Foundry's live data through FormApplication, bypassing LevelDB complexity.

**Usage in Foundry:**
1. Create a new macro in Foundry (any world with this module)
2. Paste contents from `source/macros/EXTRACT_COMPENDIUM_DATA_MACRO.js`
3. Run as GM
4. Data copied to clipboard + logged to console
5. Save output to `.dev-data/compendium-items.json`

**Output:** JSON file with all items by compendium pack:
```json
{
  "timestamp": "...",
  "packs": {
    "skills-fantasy": {
      "count": 27,
      "items": [{"name": "...", "img": "...", "type": "..."}, ...]
    }
  }
}
```

---

## Icon Mapping Generation

### `scripts/dev/generate-name-mappings.js`

Generates comprehensive name-based icon mappings from extracted compendium data.

**Usage:**
```bash
node scripts/dev/generate-name-mappings.js
```

**Input:** `.dev-data/compendium-items.json` (from extraction step)

**Output:** `.dev-data/generated-name-mappings.json` with:
- Name → icon URL mappings for each item type
- Conflict resolution (keeps most common icon when name maps to multiple icons)
- Statistics and conflict log

---

### `scripts/dev/format-name-mappings.js`

Formats generated mappings into JavaScript code ready for `scripts/lib/icon-mappings.js`.

**Usage:**
```bash
node scripts/dev/format-name-mappings.js
```

**Input:** `.dev-data/generated-name-mappings.json`

**Output:** `.dev-data/name-mappings-formatted.js` — JavaScript code that can be copy/pasted into icon-mappings.js

**Process:**
1. Run `generate-name-mappings.js`
2. Run `format-name-mappings.js`
3. Review formatted output
4. Copy/paste the nameMappings and fallbackIconMappings sections into `scripts/lib/icon-mappings.js`

---

## Icon Mapping Analysis

### `scripts/dev/analyze-mappings.js`

Analyzes compendium items to identify unmapped icons and coverage statistics.

**Usage:**
```bash
node scripts/dev/analyze-mappings.js
```

**Input:** `.dev-data/compendium-items.json`

**Output:**
- Console report: coverage by type, unmapped items, system icons still in use
- `.dev-data/mapping-analysis.json`: detailed analysis data

**Example output:**
```
Summary by Pack:
  actions-fantasy: 16/21 (76.2%) - System: 5, Unmapped: 0
  skills-fantasy: 27/27 (100.0%) - System: 0, Unmapped: 0
  ...

Totals: 794/804 (98.8%)
  System icons still in use: 5
  Unmapped paths: 5
```

---

## Utilities

### `scripts/dev/name-normalization.js`

Utility library for name normalization and variant generation. Useful for fuzzy matching item names across different naming conventions.

**Functions:**
- `normalizeItemName(name)` — canonical lowercase normalization
- `normalizeVariants(name)` — generates variant forms (singular/plural, hyphenated/spaced, abbreviated)
- `findMatchingName(itemName, availableNames)` — fuzzy name matching

**Currently:** Not used in the module runtime; available for future features like FormApplication fuzzy search or cross-setting compatibility.

---

## Foundry Macros

### `source/macros/EXTRACT_COMPENDIUM_DATA_MACRO.js`

Foundry GM macro to extract live compendium data. See [Compendium Data Extraction](#compendium-data-extraction) above.

---

## Development Data (`.dev-data/`)

Analysis outputs and intermediate files. Not committed to repo (in `.gitignore`).

- `compendium-items.json` — extracted item data from Foundry
- `generated-name-mappings.json` — generated mappings before formatting
- `name-mappings-formatted.js` — formatted JavaScript ready to copy
- `mapping-analysis.json` — analysis report data

---

## Workflow Example

To update icon mappings:

```bash
# 1. In Foundry: Create macro, run extraction macro
#    Saves output to .dev-data/compendium-items.json

# 2. Generate mappings from extracted data
node scripts/dev/generate-name-mappings.js

# 3. Format for JavaScript integration
node scripts/dev/format-name-mappings.js

# 4. Analyze coverage
node scripts/dev/analyze-mappings.js

# 5. Review .dev-data/name-mappings-formatted.js
#    Copy/paste into scripts/lib/icon-mappings.js

# 6. Test in Foundry with updated mappings
```

---

## When to Use These Tools

- **After adding new items to fantasy compendiums:** Re-extract and regenerate mappings
- **Before v0.5.6+ releases:** Run analyze-mappings.js to verify coverage
- **For cross-setting compatibility:** Use normalization utility to validate name consistency
- **Maintenance:** Keep tools up-to-date with SWADE/Foundry changes
