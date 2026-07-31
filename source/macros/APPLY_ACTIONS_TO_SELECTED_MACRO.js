/**
 * DEVELOPMENT TOOL (Foundry Macro - not part of module runtime)
 *
 * Apply Standard Actions to Selected Player Character Token(s)
 *
 * What it does:
 *   For each currently selected/controlled token whose actor is a Character
 *   (NPC tokens are skipped):
 *     1. Deletes every existing owned Item of type "action".
 *     2. Adds a fresh copy of the standard action list (below) pulled live
 *        from the actions-fantasy compendium.
 *
 *   Standard action list (17 items, kept in alphabetical order below so
 *   that's also the order they're created in -- each is given an explicit
 *   sort value so the Actions tab displays them alphabetically):
 *   Activate a Power, Aim, Attack, Called Shot, Defend, Desperate Attack,
 *   Disarm, Grapple, Move, Multi-Action, Not Sure, Push, Run/Sprint,
 *   Support, Take Cover, Test, Wild Attack.
 *
 * Usage:
 *   1. Select one or more tokens on the canvas.
 *   2. Run this macro as GM.
 *   3. Check the console/notifications for a per-actor summary.
 *
 * Destructive: existing action items on targeted actors are deleted before
 * the fresh set is added. Run APPLY_ACTIONS_TO_ALL_ACTORS_MACRO.js instead
 * for a world-wide bulk pass.
 */

const PACK_ID = "swade-fantasy-world-kit.actions-fantasy";

const STANDARD_ACTION_NAMES = [
  "Activate a Power",
  "Aim",
  "Attack",
  "Called Shot",
  "Defend",
  "Desperate Attack",
  "Disarm",
  "Disengage",
  "Grapple",
  "Move",
  "Multi-Action",
  "Not Sure",
  "Push",
  "Run",
  "Soak Damage",
  "Support",
  "Take Cover",
  "Test",
  "Wild Attack"
];

const SORT_INTEGER_DENSITY = 100000;

async function getStandardActionItemData() {
  const pack = game.packs.get(PACK_ID);
  if (!pack) throw new Error(`Pack not found: ${PACK_ID}`);

  const index = await pack.getIndex({ fields: ["name"] });
  const itemsData = [];
  const missing = [];

  for (const [i, name] of STANDARD_ACTION_NAMES.entries()) {
    const entry = index.find(e => e.name === name);
    if (!entry) {
      missing.push(name);
      continue;
    }
    const doc = await pack.getDocument(entry._id);
    const data = doc.toObject();
    delete data._id;
    data.sort = i * SORT_INTEGER_DENSITY;
    itemsData.push(data);
  }

  if (missing.length) {
    console.warn("Standard action list references items not found in the compendium:", missing);
    ui.notifications.warn(`${missing.length} standard action(s) not found in the compendium (see console).`);
  }

  return itemsData;
}

async function applyActionsToActor(actor, itemsData) {
  const existing = actor.items.filter(i => i.type === "action");
  if (existing.length) {
    await actor.deleteEmbeddedDocuments("Item", existing.map(i => i.id));
  }
  await actor.createEmbeddedDocuments("Item", itemsData);
  return existing.length;
}

async function applyToSelected() {
  const tokens = canvas.tokens.controlled;
  if (!tokens.length) {
    ui.notifications.warn("Select at least one token first.");
    return;
  }

  const itemsData = await getStandardActionItemData();
  if (!itemsData.length) {
    ui.notifications.error("No standard action items resolved from the compendium; aborting.");
    return;
  }

  let processed = 0;
  let skipped = 0;
  for (const token of tokens) {
    const actor = token.actor;
    if (!actor) continue;
    if (actor.type !== "character") {
      console.log(`${actor.name}: skipped (not a player character).`);
      skipped++;
      continue;
    }
    const removed = await applyActionsToActor(actor, itemsData);
    console.log(`${actor.name}: removed ${removed} existing action item(s), added ${itemsData.length}.`);
    processed++;
  }

  ui.notifications.success(`Standard actions applied to ${processed} actor(s).${skipped ? ` Skipped ${skipped} non-player-character(s).` : ""}`);
}

await applyToSelected();
