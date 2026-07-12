# Character Creation & Advancement Tools - Quick Start

## Three Ways to Access

### 1. **Settings Menu** (Easiest)
1. Open **Game Settings** (gear icon, bottom-left)
2. Look for **"Create Character"** button in the SWADE Fantasy World Kit section
3. Click **"Open Creator"** to launch the character creation form

### 2. **Console Command** (For Testing)
Open the Foundry console (F12 → Console tab) and paste:

```javascript
// Open character manager (unified for creation and advancement)
const actor = game.actors.contents[0];
if (actor) {
  new window.CharacterManager(actor).render(true);
} else {
  ui.notifications.warn("Select an actor first, or create a new one.");
}
```

### 3. **Macro Hotbar** (Quick Access)
1. Create a new **Script macro** in your world
2. Copy the code from:
   - **Character Creator macro:** `source/macros/CHARACTER_CREATOR_MACRO.js`
   - **Advancement Manager macro:** `source/macros/ADVANCEMENT_MANAGER_MACRO.js`
3. Paste into the macro and save
4. Drag macro to hotbar for quick access

---

## Character Creator Features
- **Ancestry Selection** — Choose from Fantasy ancestry pack
- **Skill Selection** — Pick from curated Fantasy skills
- **Edges & Hindrances** — Select edges and hindrances
- **Live Stats Preview** — See Parry, Toughness, Pace in real-time
- **Export Options**:
  - Export as JSON file (backup/sharing)
  - Create as world actor (ready to use in campaigns)

---

## Advancement Manager Features
- **XP Tracking** — View and adjust current experience points
- **Skill Advancement** — Spend XP to increase skills
- **Attribute Advancement** — Spend XP to increase attributes
- **Edge Selection** — Add new edges during advancement
- **Live Cost Preview** — See XP cost before committing

---

## Troubleshooting

### "Cannot find Character Creator"
- Reload Foundry (F5)
- Check browser console (F12) for errors
- Verify the module loads with no errors in console

### "No compendiums available"
- Ensure Fantasy compendiums are installed:
  - Ancestries, Skills, Edges, Hindrances packs
- Check if Curated Mode is enabled (may filter visibility)
- See main README for compendium visibility settings

### "Advancement Manager says 'No actor provided'"
- Select an actor's token on the map first
- OR set your user character in World settings
- Then run the macro or open from Console

---

## Settings Integration (Curated Visibility)

Character creator respects module visibility settings:
- **Curated Mode** — Only shows Fantasy packs to players
- **GM Sees All Packs** — GMs bypass filtering
- **Extra Visible Packs** — Allowlist additional packs

These are optional and gracefully degrade if not configured.
