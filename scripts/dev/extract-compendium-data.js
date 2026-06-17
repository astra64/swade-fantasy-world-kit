#!/usr/bin/env node

/**
 * DEVELOPMENT TOOL (not part of module runtime)
 *
 * Extract item names and icon paths from fantasy compendiums.
 * In practice, use source/macros/EXTRACT_COMPENDIUM_DATA_MACRO.js (Foundry macro) instead.
 *
 * See DEVELOPMENT_TOOLS.md for full workflow.
 */

const fs = require("fs");
const path = require("path");

const PACKS_DIR = path.join(__dirname, "packs");
const COMPENDIUM_PACKS = [
  "actions-fantasy",
  "ancestries-fantasy",
  "armor-and-shields-fantasy",
  "armor-sets-fantasy",
  "edges-fantasy",
  "gear-fantasy",
  "hindrances-fantasy",
  "magic-items-fantasy",
  "powers-fantasy",
  "skills-fantasy",
  "weapons-fantasy"
];

function extractItemsFromPackDir(packPath) {
  const items = [];
  const seen = new Set();

  try {
    const files = fs.readdirSync(packPath);
    const ldbFiles = files.filter(f => f.endsWith(".ldb")).sort();

    for (const ldbFile of ldbFiles) {
      const ldbPath = path.join(packPath, ldbFile);
      const buffer = fs.readFileSync(ldbPath);

      // Convert buffer to UTF-8 string and clean it
      let text = buffer.toString("utf8");

      // Find strings that look like valid paths (modules/... .svg or .webp)
      // and try to extract name-img pairs around them
      const pathPattern = /"img"\s*:\s*"(modules\/[^"]*\.(?:svg|webp|png|jpg))"/g;
      let pathMatch;

      while ((pathMatch = pathPattern.exec(text)) !== null) {
        const imgPath = pathMatch[1];

        // Look backwards from this img path to find the name
        const searchStart = Math.max(0, pathMatch.index - 500);
        const contextBefore = text.substring(searchStart, pathMatch.index);

        // Find the last "name": "..." before the img path
        const namePattern = /"name"\s*:\s*"([^"]*)"/;
        const nameMatches = [...contextBefore.matchAll(new RegExp(namePattern.source, 'g'))];

        if (nameMatches.length > 0) {
          const lastName = nameMatches[nameMatches.length - 1][1];

          // Clean up any escaped quotes or weird characters
          if (lastName && lastName.length > 0 && lastName.length < 200) {
            const key = `${lastName}|${imgPath}`;
            if (!seen.has(key)) {
              seen.add(key);
              items.push({
                name: lastName,
                img: imgPath
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error reading pack ${packPath}:`, err.message);
  }

  return items;
}

function inferItemType(packName) {
  // Map pack names to item types
  const typeMap = {
    "actions-fantasy": "Action",
    "ancestries-fantasy": "Ancestry",
    "armor-and-shields-fantasy": "Armor",
    "armor-sets-fantasy": "ArmorSet",
    "edges-fantasy": "Edge",
    "gear-fantasy": "Gear",
    "hindrances-fantasy": "Hindrance",
    "magic-items-fantasy": "MagicItem",
    "powers-fantasy": "Power",
    "skills-fantasy": "Skill",
    "weapons-fantasy": "Weapon"
  };
  return typeMap[packName] || packName;
}

function main() {
  const result = {
    timestamp: new Date().toISOString(),
    packs: {}
  };

  for (const packName of COMPENDIUM_PACKS) {
    const packPath = path.join(PACKS_DIR, packName);

    if (!fs.existsSync(packPath)) {
      console.error(`Pack not found: ${packPath}`);
      continue;
    }

    console.error(`Extracting from ${packName}...`);

    const items = extractItemsFromPackDir(packPath);
    const itemType = inferItemType(packName);

    result.packs[packName] = {
      type: itemType,
      count: items.length,
      items: items.sort((a, b) => a.name.localeCompare(b.name))
    };

    console.error(`  Found ${items.length} items`);
  }

  // Output as JSON to stdout
  console.log(JSON.stringify(result, null, 2));
}

main();
