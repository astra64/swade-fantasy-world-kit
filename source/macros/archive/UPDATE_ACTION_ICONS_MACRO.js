/**
 * DEVELOPMENT TOOL (Foundry Macro - not part of module runtime)
 *
 * Update Actions Compendium Icons to Foundry's Default Icon Library
 *
 * What it does:
 *   Replaces every item's img in the actions-fantasy compendium with a path
 *   from Foundry's own bundled icon library (the "icons/" web-root folder
 *   shipped with the application, not this module's "blackbackground/" set
 *   or the SWADE system's assets).
 *
 *   No SVGs are used -- only Foundry's bundled webp art (icons/skills,
 *   icons/magic, icons/weapons, etc.) to match the visual style already
 *   used by the new action items.
 *
 *   Since several of these paths are best-effort guesses at filenames in
 *   Foundry's core icon set, each candidate is verified with a HEAD request
 *   against the running server before being applied. If a candidate 404s,
 *   the next candidate is tried; if all candidates fail, the item falls
 *   back to icons/containers/bags/pack-leather-brown.webp and is logged so
 *   you can pick something better by hand.
 *
 * Usage:
 *   1. Create a new macro in Foundry (type: script)
 *   2. Paste this entire file as macro content
 *   3. Run as GM
 *   4. Check the console for a table of what changed and what fell back to
 *      the default icon -- review those in the compendium afterward.
 *
 * Safe to re-run.
 */

const PACK_ID = "swade-fantasy-world-kit.actions-fantasy";
const DEFAULT_ICON = "icons/containers/bags/pack-leather-brown.webp";

// name -> ordered list of candidate icon paths, first valid one wins
const ICON_CANDIDATES = {
  // Existing items
  "Damage": ["icons/skills/melee/blood-slash-foam-red.webp", "icons/skills/melee/strike-blade-blood-red.webp"],
  "Disarm": ["icons/skills/melee/hand-grip-sword-orange.webp", "icons/weapons/swords/sword-guard-gold.webp"],
  "Double Tap": ["icons/skills/ranged/gun-fire-flame-orange.webp", "icons/weapons/guns/gun-pistol-flintlock-brown.webp"],
  "Fear": ["icons/magic/death/skull-horned-goat-fire-orange.webp", "icons/skills/social/wave-halt-stop.webp"],
  "Frenzy": ["icons/skills/melee/strikes-blade-red.webp"],
  "Grapple": ["icons/skills/social/intimidation-impressing.webp"],
  "Improved Frenzy": ["icons/skills/melee/blade-tips-red.webp"],
  "Jump": ["icons/skills/movement/figure-running-gray.webp", "icons/skills/movement/feet-winged-boots-brown.webp"],
  "Natural Healing": ["icons/magic/life/cross-worn-green.webp", "icons/magic/life/heart-cross-strong-flame-green.webp"],
  "Network (Intimidate)": ["icons/skills/social/intimidation-impressing.webp"],
  "Network (Socialise)": ["icons/skills/social/diplomacy-handshake-gray.webp"],
  "Poison": ["icons/consumables/potions/potion-tube-corked-poison-green.webp", "icons/magic/unholy/silhouette-evil-horned-giant.webp"],
  "Push": ["icons/skills/movement/arrow-upward-blue.webp"],
  "ROF2": ["icons/weapons/guns/gun-pistol-flintlock-brown.webp"],
  "ROF3": ["icons/weapons/guns/gun-pistol-flintlock-brown.webp"],
  "ROF4": ["icons/weapons/guns/gun-pistol-flintlock-brown.webp"],
  "ROF5": ["icons/weapons/guns/gun-pistol-flintlock-brown.webp"],
  "ROF6": ["icons/weapons/guns/gun-pistol-flintlock-brown.webp"],
  "Suppressive Fire": ["icons/skills/ranged/arrow-flying-glow-green.webp"],
  "Treat Wounds": ["icons/magic/life/cross-worn-green.webp"],
  "Wild Attack": ["icons/skills/melee/sword-twirl-orange.webp"],

  // Items previously created with a non-default fallback icon
  "Withdraw from Combat": ["icons/skills/movement/feet-winged-boots-brown.webp", "icons/skills/movement/figure-running-gray.webp"],
  "Recover from Shaken": ["icons/magic/life/heart-cross-strong-flame-green.webp"],
  "Activate a Power": ["icons/magic/lightning/bolt-blue.webp", "icons/magic/lightning/orb-ball-purple.webp"]
};

async function iconExists(path) {
  try {
    const res = await fetch(foundry.utils.getRoute(path), { method: "HEAD" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function resolveIcon(name, candidates) {
  for (const candidate of candidates) {
    if (await iconExists(candidate)) return candidate;
  }
  return null;
}

async function updateActionIcons() {
  const pack = game.packs.get(PACK_ID);
  if (!pack) {
    ui.notifications.error(`Pack not found: ${PACK_ID}`);
    return;
  }

  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  const index = await pack.getIndex({ fields: ["name", "img"] });
  let updated = 0;
  let fellBackToDefault = 0;
  const fallbackLog = [];

  for (const entry of index) {
    const candidates = ICON_CANDIDATES[entry.name];
    if (!candidates) {
      console.log(`No icon mapping defined (skipped): ${entry.name}`);
      continue;
    }

    let resolved = await resolveIcon(entry.name, candidates);
    if (!resolved) {
      resolved = DEFAULT_ICON;
      fellBackToDefault++;
      fallbackLog.push(entry.name);
    }

    if (entry.img === resolved) continue;

    const doc = await pack.getDocument(entry._id);
    await doc.update({ img: resolved });
    updated++;
    console.log(`${entry.name}: ${entry.img} -> ${resolved}`);
  }

  if (wasLocked) await pack.configure({ locked: true });

  ui.notifications.success(
    `Icons updated: ${updated} changed, ${fellBackToDefault} fell back to default icon.`
  );
  if (fallbackLog.length) {
    console.warn("Fell back to default icon (pick something better by hand):", fallbackLog);
  }
}

await updateActionIcons();
