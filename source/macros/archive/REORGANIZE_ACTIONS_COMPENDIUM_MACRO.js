/**
 * DEVELOPMENT TOOL (Foundry Macro - not part of module runtime)
 *
 * Reorganize + Populate the Actions Compendium
 *
 * What it does:
 *   1. Sets system.category on the 21 existing action items to one of our
 *      5 category values (Movement, Attacks, Ranged-Specific, Defense,
 *      Utility & Support) -- the same schema field the default
 *      swade-core-rules "Actions" compendium uses (system.category), but
 *      with our own category values instead of reusing theirs. This keeps
 *      everything in ONE flat compendium; no folders are created.
 *   2. Creates the new action items below (skips any that already exist by
 *      name) with system.category set the same way.
 *
 * Usage:
 *   1. Create a new macro in Foundry (type: script)
 *   2. Paste this entire file as macro content
 *   3. Run as GM
 *   4. Check the console/notifications for a summary; review the compendium
 *      afterward before closing Foundry.
 *
 * Safe to re-run: existing items are matched by name and skipped instead of
 * duplicated (category is still re-applied on every run).
 */

const PACK_ID = "swade-fantasy-world-kit.actions-fantasy";
const FALLBACK_ICON = "systems/swade/assets/icons/action.svg";

// Existing items -> category assignment (by exact current name)
const EXISTING_ITEM_CATEGORIES = {
  "Damage": "Attacks",
  "Disarm": "Attacks",
  "Double Tap": "Attacks",
  "Fear": "Utility & Support",
  "Frenzy": "Attacks",
  "Grapple": "Attacks",
  "Improved Frenzy": "Attacks",
  "Jump": "Movement",
  "Natural Healing": "Utility & Support",
  "Network (Intimidate)": "Utility & Support",
  "Network (Socialise)": "Utility & Support",
  "Poison": "Utility & Support",
  "Push": "Attacks",
  "ROF2": "Ranged-Specific",
  "ROF3": "Ranged-Specific",
  "ROF4": "Ranged-Specific",
  "ROF5": "Ranged-Specific",
  "ROF6": "Ranged-Specific",
  "Suppressive Fire": "Ranged-Specific",
  "Treat Wounds": "Utility & Support",
  "Wild Attack": "Attacks"
};

// New items to create: name, category, description, optional icon override
const NEW_ITEMS = [
  {
    name: "Regular Attack",
    category: "Attacks",
    img: "icons/skills/melee/strike-sword-steel-yellow.webp",
    description: "Make a Fighting roll (melee) or Shooting roll (ranged) against the target's Parry or ranged defense to deal damage."
  },
  {
    name: "Multi-Action",
    category: "Utility & Support",
    img: "icons/skills/melee/strikes-sword-scimitar.webp",
    description: "Perform up to three actions in one turn, at a cumulative penalty: -2 for two actions, -4 for three."
  },
  {
    name: "Desperate Attack",
    category: "Attacks",
    img: "icons/skills/melee/maneuver-greatsword-yellow.webp",
    description: "Add +2 or +4 to your Fighting roll, subtracting the same amount from damage on a hit. Can't be combined with Wild Attack."
  },
  {
    name: "Called Shot",
    category: "Attacks",
    img: "icons/skills/ranged/target-bullseye-arrow-blue.webp",
    description: "Target a specific location using the Size & Scale Modifier. A shot to the head adds +4 damage; a shot that Shakes or Wounds an arm may disarm the target (Strength roll at -2 for the arm, -4 for the hand)."
  },
  {
    name: "Aim",
    category: "Attacks",
    img: "icons/skills/ranged/person-archery-bow-attack-orange.webp",
    description: "Forgo movement and all other actions to gain +2 to your next attack roll, melee or ranged, before your next turn."
  },
  {
    name: "Defend",
    category: "Defense",
    img: "icons/skills/melee/shield-block-gray-orange.webp",
    description: "Take no action this turn to gain +4 Parry until your next action. You may move your full Pace but may not run."
  },
  {
    name: "Test",
    category: "Attacks",
    img: "icons/skills/social/thumbsup-approval-like.webp",
    description: "Instead of attacking, oppose a skill against the target's Trait (e.g. Taunt, Trick, Trip). Success makes the target Distracted or Vulnerable (your choice); a raise also Shakes them."
  },
  {
    name: "Reload",
    category: "Ranged-Specific",
    img: "icons/weapons/ammunition/bullets-cartridge-shell-gray.webp",
    description: "Spend the actions required by your weapon's Reload rating to reload before firing again."
  },
  {
    name: "Movement",
    category: "Movement",
    img: "icons/skills/movement/arrow-upward-yellow.webp",
    description: "Move up to your Pace each turn in addition to your action. Climbing, crawling, swimming, and Difficult Ground each cost 2\" of Pace per 1\" moved (crawling ignores Difficult Ground). Hazardous movement may require an Athletics roll."
  },
  {
    name: "Run/Sprint",
    category: "Movement",
    img: "icons/skills/movement/figure-running-gray.webp",
    description: "Add your Running die (d6, doesn't Ace) to your Pace this round, at a -2 penalty to all other actions. Declare at the start of your turn."
  },
  {
    name: "Take Cover",
    category: "Movement",
    img: "icons/skills/movement/arrow-upward-blue.webp",
    description: "Move to a position with cover, reducing your chance to be hit by ranged attacks by -2 to -4 depending on cover level."
  },
  {
    name: "Escape",
    category: "Movement",
    img: "icons/skills/social/intimidation-impressing.webp",
    description: "Make an opposed Athletics roll against your grappler's Athletics or Strength to break free of a Grapple or bonds."
  },
  {
    name: "Withdraw from Combat",
    category: "Movement",
    img: FALLBACK_ICON,
    description: "Move away from an adjacent foe without provoking a free attack. SWADE grants no free attacks by default unless a specific Edge, Hindrance, or ability says otherwise."
  },
  {
    name: "Prone",
    category: "Defense",
    img: "icons/magic/control/silhouette-fall-slip-prone.webp",
    description: "Ranged attacks against you from 3\" or more suffer -4 to hit (no stacking with Cover) and Area Effect damage against you is reduced by 4. In melee while prone, your Parry drops by 2 and your Fighting rolls suffer -2. Standing costs 2\" of movement; dropping prone is free."
  },
  {
    name: "Recover from Shaken",
    category: "Defense",
    img: FALLBACK_ICON,
    description: "Forgo all other actions to make a Spirit roll. Success removes Shaken."
  },
  {
    name: "Support",
    category: "Utility & Support",
    img: "icons/skills/social/diplomacy-handshake-gray.webp",
    description: "Aid an ally instead of acting directly: roll a relevant skill to grant them +1 on a success or +2 on a raise to a specific Trait roll, up to a maximum of +4 from all sources."
  },
  {
    name: "Activate a Power",
    category: "Utility & Support",
    img: FALLBACK_ICON,
    description: "Make an arcane skill roll (e.g. Spellcasting) at the power's difficulty to activate it. Rolling a 1 on the skill die, regardless of the Wild Die, causes Backlash."
  },
  {
    name: "Drop an Item",
    category: "Utility & Support",
    img: "icons/magic/movement/chevrons-down-yellow.webp",
    description: "Drop a held item voluntarily. Free action."
  },
  {
    name: "Speak",
    category: "Utility & Support",
    img: "icons/skills/trades/music-singing-voice-blue.webp",
    description: "Say one or two brief sentences during your turn. Free action."
  },
  {
    name: "Not Sure",
    category: "Utility & Support",
    img: "icons/magic/symbols/question-stone-yellow.webp",
    description: "Unsure whether an action is free, or which existing action fits what you want to do? Ask the GM."
  }
];

async function reorganizeActionsCompendium() {
  const pack = game.packs.get(PACK_ID);
  if (!pack) {
    ui.notifications.error(`Pack not found: ${PACK_ID}`);
    return;
  }

  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  // 1. Set category on existing items
  const index = await pack.getIndex({ fields: ["name"] });
  let recategorized = 0;
  for (const [name, category] of Object.entries(EXISTING_ITEM_CATEGORIES)) {
    const entry = index.find(e => e.name === name);
    if (!entry) {
      console.warn(`Existing item not found (skipped): ${name}`);
      continue;
    }
    const doc = await pack.getDocument(entry._id);
    if (doc.system.category === category) continue;
    await doc.update({ "system.category": category });
    recategorized++;
  }

  // 2. Create new items (skip if name already exists)
  let created = 0;
  const currentIndex = await pack.getIndex({ fields: ["name"] });
  for (const item of NEW_ITEMS) {
    if (currentIndex.find(e => e.name === item.name)) {
      console.log(`Already exists (skipped): ${item.name}`);
      continue;
    }
    await Item.create(
      {
        name: item.name,
        type: "action",
        img: item.img,
        system: {
          category: item.category,
          description: `<p>${item.description}</p>`
        }
      },
      { pack: PACK_ID }
    );
    created++;
  }

  if (wasLocked) await pack.configure({ locked: true });

  ui.notifications.success(
    `Actions compendium updated: ${created} items created, ${recategorized} existing items recategorized.`
  );
  console.log(`Done. Created ${created} new items, recategorized ${recategorized} existing items.`);
}

await reorganizeActionsCompendium();
