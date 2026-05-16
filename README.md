# SWADE Fantasy World Kit

> **AI note:** Built with help from GitHub Copilot for drafting and iteration. Final decisions, direction, and edits were made by the developer.

A Foundry VTT module for fantasy SWADE games. It does three things:

1. **Curated compendiums** — a set of fantasy SWADE content packs (ancestries, edges, equipment, powers, and more) organised into labelled folders in the compendium sidebar.
2. **Controlled visibility** — limits which compendiums players can see, keeping the sidebar clean. You choose what's exposed; Quick Insert automatically respects the same rules.
3. **World setup tools** — a Preset Modules manager that lets you define named module presets and apply them to the world in one click.

> **Planned direction (parked):** after current roadmap work is finished, only **World setup tools** are planned for extraction into a separate system-agnostic dependency module. Curated compendiums and controlled visibility remain SWADE-focused in this package.

**Requires:** Foundry VTT v13+, SWADE system, SWADE Core Rules, SWADE Fantasy Companion, Game Icons.net

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
3. Click **Save to Preset** to store the current selection.
4. Click **Apply Preset to World** to apply activation changes. Foundry will reload automatically when changes are made.

The manager will warn you if any selected modules have dependencies that aren't also selected, and offer to include them automatically.

#### Notes

- The manager only enables modules that are already installed. It does not download or install missing modules.
- Applying a preset is authoritative: modules in the preset are enabled, and other currently active modules are disabled (except this module itself).
- Required dependencies of this module (SWADE Core Rules, SWADE Fantasy Companion, Game Icons.net) are always included and cannot be removed from the baseline.
- Module titles are cached so previously-configured entries are still identifiable even after a module is uninstalled.
- Presets can be created, renamed, duplicated, and deleted from **Manage Presets**.

---

## Editing Compendium Content

### Edit an Existing Compendium

1. Open Foundry as GM in a world with this module enabled.
2. Open the target compendium, unlock it, and make your edits.
3. Re-lock the compendium when done.
4. Close Foundry cleanly before committing (avoids partial writes).

### Add a New Compendium

1. Create the new compendium pack in Foundry (set the correct document type and system).
2. Populate or import entries.
3. Close Foundry cleanly.
4. Add a new pack entry to `module.json` under `packs` and add its name to the appropriate `packFolders` group.
5. Restart Foundry and confirm the pack appears and behaves correctly.

> Do not hand-edit `.ldb` files directly. Do not commit while Foundry is running.


