# SWADE Fantasy World Kit

> **AI Usage Disclosure** Built for personal use with GitHub Copilot as a coding assistant. All design decisions, feature direction, and implementation were driven by the human developer — Copilot was a tool, not an author.

A Foundry VTT module for fantasy SWADE games. It does three things:

1. **Curated compendiums** — a set of fantasy SWADE content packs (ancestries, edges, equipment, powers, and more) organised into labelled folders in the compendium sidebar.
2. **Controlled visibility** — limits which compendiums players can see, keeping the sidebar clean. You choose what's exposed; Quick Insert automatically respects the same rules.
3. **World setup tools** — a Baseline Module Manager that lets you define a list of modules that should be active for a world and enable them all in one click. Supports a global profile so your setup travels across worlds.

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

### Baseline Module Manager

The Baseline Module Manager lets you define a list of modules that should be active for a world, then enable them all in one click. Useful for quickly spinning up new worlds with a consistent setup.

**To open it:** Settings → Module Settings → SWADE Fantasy World Kit → **Baseline Modules → Configure and Apply**

#### World Baseline

1. Search or scroll through the installed modules list and check the ones you want.
2. Click **Save Selection** to store the list for this world.
3. Click **Apply Baseline** to enable all installed modules from the list. Foundry will reload the world automatically.

The manager will warn you if any selected modules have dependencies that aren't also selected, and offer to include them automatically.

#### Global Profile

You can save a baseline profile that travels with you across worlds on the same Foundry install:

- **Save Selection as Global** — saves the current selection as your global profile
- **Load Global Profile** — loads your global profile into the current selection
- **Apply Global to This World** — replaces this world's baseline with your global profile and applies it

#### Notes

- The manager only enables modules that are already installed. It does not download or install missing modules.
- Required dependencies of this module (SWADE Core Rules, SWADE Fantasy Companion, Game Icons.net) are always included and cannot be removed from the baseline.
- Module titles are cached so previously-configured entries are still identifiable even after a module is uninstalled.
- Each configured entry has a **×** button (visible on hover) to remove it directly without editing the full list.

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


