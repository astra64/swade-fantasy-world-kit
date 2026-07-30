/**
 * DEVELOPMENT TOOL (Foundry Macro - not part of module runtime)
 *
 * Set Actions Compendium Categories
 *
 * What it does:
 *   Sets system.category on every item in the actions-fantasy compendium to
 *   one of: Common, Situational, Edges, Reference, Misc, Free Actions.
 *
 *   Only touches system.category -- does not touch img, so it's safe to run
 *   after manually re-picking icons for individual items.
 *
 * Usage:
 *   1. Create a new macro in Foundry (type: script)
 *   2. Paste this entire file as macro content
 *   3. Run as GM
 *   4. Check the console/notifications for a summary.
 *
 * Safe to re-run: items already on the correct category are skipped.
 */

const PACK_ID = "swade-fantasy-world-kit.actions-fantasy";

// name -> category
const CATEGORY_ASSIGNMENTS = {
  // Common
  "Regular Attack": "Common",
  "Wild Attack": "Common",
  "Desperate Attack": "Common",
  "Defend": "Common",
  "Multi-Action": "Common",
  "Test": "Common",
  "Support": "Common",
  "Activate a Power": "Common",

  // Situational
  "Called Shot": "Situational",
  "Aim": "Situational",
  "Grapple": "Situational",
  "Push": "Situational",
  "Disarm": "Situational",
  "Escape": "Situational",
  "Reload": "Situational",
  "Suppressive Fire": "Situational",

  // Misc
  "ROF2": "Misc",
  "ROF3": "Misc",
  "ROF4": "Misc",
  "ROF5": "Misc",
  "ROF6": "Misc",

  // Reference
  "Natural Healing": "Reference",
  "Treat Wounds": "Reference",
  "Network (Intimidate)": "Reference",
  "Network (Socialise)": "Reference",
  "Fear": "Reference",
  "Poison": "Reference",
  "Damage": "Reference",

  // Edges
  "Frenzy": "Edges",
  "Improved Frenzy": "Edges",
  "Double Tap": "Edges",

  // Free Actions
  "Movement": "Free Actions",
  "Run/Sprint": "Free Actions",
  "Speak": "Free Actions",
  "Prone": "Free Actions",
  "Drop an Item": "Free Actions",
  "Not Sure": "Free Actions",
  "Jump": "Free Actions",
  "Take Cover": "Free Actions",
  "Withdraw from Combat": "Free Actions",
  "Recover from Shaken": "Free Actions"
};

async function setActionCategories() {
  const pack = game.packs.get(PACK_ID);
  if (!pack) {
    ui.notifications.error(`Pack not found: ${PACK_ID}`);
    return;
  }

  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  const index = await pack.getIndex({ fields: ["name"] });
  let updated = 0;
  const unmapped = [];

  for (const entry of index) {
    const category = CATEGORY_ASSIGNMENTS[entry.name];
    if (!category) {
      unmapped.push(entry.name);
      continue;
    }

    const doc = await pack.getDocument(entry._id);
    if (doc.system.category === category) continue;

    await doc.update({ "system.category": category });
    updated++;
    console.log(`${entry.name}: category -> ${category}`);
  }

  if (wasLocked) await pack.configure({ locked: true });

  ui.notifications.success(`Categories updated: ${updated} items changed.`);
  if (unmapped.length) {
    console.warn("No category mapping defined (skipped):", unmapped);
  }
}

await setActionCategories();
