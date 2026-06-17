/**
 * DEVELOPMENT TOOL (Foundry Macro - not part of module runtime)
 *
 * Extract Fantasy Compendium Items and Icon Paths
 *
 * Usage:
 *   1. Create new macro in Foundry
 *   2. Paste this entire file as macro content
 *   3. Run as GM
 *   4. Data copied to clipboard + logged to console
 *   5. Save output to .dev-data/compendium-items.json for next step
 *
 * See DEVELOPMENT_TOOLS.md for full workflow.
 */

const FANTASY_PACKS = [
  "swade-fantasy-world-kit.actions-fantasy",
  "swade-fantasy-world-kit.ancestries-fantasy",
  "swade-fantasy-world-kit.armor-and-shields-fantasy",
  "swade-fantasy-world-kit.armor-sets-fantasy",
  "swade-fantasy-world-kit.edges-fantasy",
  "swade-fantasy-world-kit.gear-fantasy",
  "swade-fantasy-world-kit.hindrances-fantasy",
  "swade-fantasy-world-kit.magic-items-fantasy",
  "swade-fantasy-world-kit.powers-fantasy",
  "swade-fantasy-world-kit.skills-fantasy",
  "swade-fantasy-world-kit.weapons-fantasy"
];

async function extractCompendiumData() {
  const result = {
    timestamp: new Date().toISOString(),
    packs: {}
  };

  for (const packName of FANTASY_PACKS) {
    ui.notifications.info(`Extracting ${packName}...`);

    const pack = game.packs.get(packName);
    if (!pack) {
      console.warn(`Pack not found: ${packName}`);
      continue;
    }

    const items = [];
    const index = await pack.getIndex();

    for (const entry of index) {
      if (entry.name && entry.img) {
        items.push({
          name: entry.name,
          img: entry.img,
          type: entry.type || pack.type
        });
      }
    }

    result.packs[packName.split(".")[1]] = {
      type: pack.type,
      count: items.length,
      items: items.sort((a, b) => a.name.localeCompare(b.name))
    };

    console.log(`  Found ${items.length} items in ${packName}`);
  }

  // Copy to clipboard as JSON
  const jsonStr = JSON.stringify(result, null, 2);
  await navigator.clipboard.writeText(jsonStr);

  ui.notifications.success(`Extracted ${Object.keys(result.packs).length} packs. Data copied to clipboard!`);
  console.log("Full data:", result);

  return result;
}

// Run the extraction
await extractCompendiumData();
