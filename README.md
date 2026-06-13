# SWADE Fantasy World Kit

> **AI note:** Built with help from GitHub Copilot for drafting and iteration. Final decisions, direction, and edits were made by the developer.

A Foundry VTT module for fantasy SWADE games. It does three things:

1. **Curated compendiums** — a set of fantasy SWADE content packs (ancestries, edges, equipment, powers, and more) organised into labelled folders in the compendium sidebar.
2. **Controlled visibility** — limits which compendiums players can see, keeping the sidebar clean. You choose what's exposed; Quick Insert automatically respects the same rules.
3. **World setup tools** — a Preset Modules manager that lets you define named module presets and apply them to the world in one click.

> **Planned direction (parked):** after current roadmap work is finished, World setup tools are planned for extraction into a separate system-agnostic dependency module. This hub module will be expanded with support for additional compendium sets across different genres and settings (Sci-fi, Warhammer, etc.) and will gain simple character creation tools (skill calculator and edges/hindrances helpers) integrated with the active compendium set. Curated compendiums and controlled visibility remain SWADE-focused in this package.

**Requires:** Foundry VTT v14+, SWADE system, SWADE Core Rules, SWADE Fantasy Companion, Game Icons.net

---

## Installation

**Install by manifest URL** (recommended):

1. In Foundry's Setup screen, go to **Add-on Modules → Install Module**
2. Paste the manifest URL into the field at the bottom and click **Install**

**Manual install:**

Download the repository as a zip, extract it into your `Data/modules/` folder, and restart Foundry.

---

## Included Compendiums

All compendiums are drawn from the SWADE Fantasy Companion and organised into three folders:

| Folder | Compendiums |
|---|---|
| SWADE Fantasy Characters | Ancestries, Edges, Hindrances, Skills |
| SWADE Fantasy Core | Actions, Powers, Pregens |
| SWADE Fantasy Equipment | Armor & Shields, Armor Sets, Gear, Magic Items, Weapons |

---

## Features

### Curated Compendium Visibility

By default, only this module's compendiums are visible to players. You can expand what players see using the **Choose Visible Packs** setting.

**Settings → Module Settings → SWADE Fantasy World Kit:**

| Setting | Default | Description |
|---|---|---|
| Curated Mode | On | Limits the compendium sidebar to curated packs for players |
| GM Sees All Packs | On | GMs always see everything regardless of curated mode |
| Choose Visible Packs | — | Opens a searchable selector to whitelist additional packs for players |

If you use **Quick Insert**, pack visibility restrictions are automatically synced so player searches respect the same rules.

---

### Preset Modules Manager

The Preset Modules manager lets you define named presets of modules, then apply a preset to the world in one click. Useful for quickly switching world configurations.

**To open it:** Settings → Module Settings → SWADE Fantasy World Kit → **Preset Modules → Configure and Apply**

**Quick open:** `Ctrl+Shift+B` (GM only)

#### Preset Workflow

1. Search or scroll through the installed modules list and check the ones you want.
2. Choose the preset you want to edit from **Editing Preset**.
3. Click **Save Preset** to review your changes:
   - A diff dialog shows what will be added/removed from the preset.
   - Click "Save" to save, or "Save & Apply" to save and immediately apply to the world.
4. Click **Apply Preset to World** to apply activation changes:
   - A preview dialog shows what will be enabled/disabled in the world.
   - Foundry will reload automatically when module activation changes are made.
5. Use **Revert** (in the summary row) to discard unsaved edits and reset to the saved preset.

The manager will warn you if any selected modules have dependencies that aren't also selected, and offer to include them automatically.

#### Notes

- The manager only enables modules that are already installed. It does not download or install missing modules.
- Applying a preset is authoritative: modules in the preset are enabled, and other currently active modules are disabled (except this module itself).
- Required dependencies of this module (SWADE Core Rules, SWADE Fantasy Companion, Game Icons.net) are always included and cannot be removed from the baseline.
- Module titles are cached so previously-configured entries are still identifiable even after a module is uninstalled.
- Presets can be created, renamed, duplicated, and deleted from **Manage Presets**.
- **Export/Import Presets**: Export a preset to clipboard as JSON (preserves module IDs and schema version). Import presets from JSON with conflict detection—choose "Import Anyway" to keep all module IDs, or "Filter & Import" to remove modules not installed in your world.
- Missing modules in presets can be removed via the delete button (×) in the Preset Contents section without re-rendering the entire dialog.

---

## Icon Remapping Macro

This module includes a utility macro that remaps old Fantasy Companion icons to modern **game-icons-net** equivalents. Useful for updating world items and iterating on compendium content.

### What It Does

The macro scans and remaps icons for:
- All world items
- All items in world actors
- All items in **unlocked compendiums** (useful for maintaining compendium consistency as you iterate)

It intelligently matches icons across 102 mappings (36 SWADE system icons + 66 Fantasy Companion icons) and applies appropriate fallback icons for unmapped items.

**Mapping Priority:**
1. Path-based exact match (SWADE system or Fantasy Companion icon paths)
2. Name-based soft lookup (for items sharing default icons)
3. Fallback icon by item type (Skill, Edge, Hindrance, Power, Ancestry)

### How to Use

**Via Macro in Foundry:**

1. Open Foundry and go to the **Macros** tab
2. Click **Create Macro**
3. Set type to **Script**
4. Paste this code:
```javascript
(async () => {
  if (!game.user?.isGM) {
    ui.notifications?.error("Only GMs can remap icons.");
    return;
  }

  const remapper = window.swadeFwkIconRemapper;
  if (!remapper) {
    ui.notifications?.error("Icon remapper not loaded. Ensure SWADE Fantasy World Kit module is active and enabled.");
    return;
  }

  let count = 0;
  let packCount = 0;

  // Scan world items
  for (const item of game.items ?? []) {
    const newIcon = remapper(item);
    if (newIcon && newIcon !== item.img) {
      await item.update({ img: newIcon });
      count++;
    }
  }

  // Scan actor items
  for (const actor of game.actors ?? []) {
    for (const item of actor.items ?? []) {
      const newIcon = remapper(item);
      if (newIcon && newIcon !== item.img) {
        await item.update({ img: newIcon });
        count++;
      }
    }
  }

  // Scan unlocked compendiums
  for (const pack of game.packs) {
    if (!pack.locked) {
      for (const item of pack.contents ?? []) {
        const newIcon = remapper(item);
        if (newIcon && newIcon !== item.img) {
          await item.update({ img: newIcon });
          count++;
          packCount++;
        }
      }
    }
  }

  const summary = `${count} item(s) updated (${packCount} in compendiums)`;
  ui.notifications?.info(`Icon remapping complete. ${summary}`);

  new Dialog({
    title: "Icon Remapping Summary",
    content: `<p>${summary}</p>`,
    buttons: {
      close: {
        label: "Close"
      }
    }
  }).render(true);
})();
```

5. Name it "Remap Icons" (or your preference)
6. Run as GM by clicking **Execute Macro**

### Notes

- Only remaps icons that have a known mapping (existing icons unchanged if not in mapping)
- Safe to run multiple times (skips already-remapped icons)
- Shows summary dialog with count of remapped items
- GM-only for security
- **Compendium Note:** Only unlocks compendiums that you've manually unlocked in Foundry are affected. This is intentional—lock compendiums you don't want modified.

---

## Editing Compendium Content

### Edit an Existing Compendium

1. Open Foundry as GM in a world with this module enabled.
2. In the compendium sidebar, right-click the target compendium and select "Edit" (or click its lock icon to unlock).
3. Make your edits through Foundry's UI.
4. Lock the compendium when done.
5. **Close Foundry completely** before committing changes (Foundry uses LevelDB files that may have partial writes while running).

### Add a New Compendium Setting

1. Create new compendium packs in Foundry (one for each category in your setting).
2. Close Foundry completely.
3. Open `module.json` and add new entries under `packs`:
   - `name`: unique machine-readable ID (e.g., `"armor-sets-mysetting"`)
   - `label`: display name in Foundry UI (e.g., `"Armor Sets (My Setting)"`)
   - `path`: folder path (e.g., `"packs/armor-sets-mysetting"`)
   - `type`: document type (`"Item"` or `"Actor"`)
   - `system`: `"swade"`
   - `ownership`: set appropriate player/assistant permissions
4. Create a new `packFolders` entry for your setting (Core, Equipment, Characters).
5. Add all new pack names to your setting's folders.
6. Restart Foundry and confirm packs appear with correct data and organization.

> **Do not:** hand-edit `.ldb` files directly or commit while Foundry is running. Foundry owns these files and corrupting them breaks everything.

### Planned Features

**Developer tools for compendium management** — Potential future workflow improvements for managing custom packs (e.g., helper UI for module.json updates, validation tools). Currently these operations are manual but straightforward enough that tooling is not a priority.


