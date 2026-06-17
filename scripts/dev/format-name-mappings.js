#!/usr/bin/env node

/**
 * DEVELOPMENT TOOL (not part of module runtime)
 *
 * Format generated name mappings into JavaScript code ready for icon-mappings.js.
 *
 * Usage: node scripts/dev/format-name-mappings.js
 * Input:  .dev-data/generated-name-mappings.json
 * Output: .dev-data/name-mappings-formatted.js (copy/paste into icon-mappings.js)
 *
 * See DEVELOPMENT_TOOLS.md for full workflow.
 */

const fs = require("fs");
const path = require("path");

const generatedPath = path.join(__dirname, "../../.dev-data/generated-name-mappings.json");
const outputPath = path.join(__dirname, "../../.dev-data/name-mappings-formatted.js");

const generated = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));

// Generate JavaScript code
let output = `/**
 * Name-based soft lookup for items sharing default icons.
 * Used when items have the same placeholder icon but you want variation by name.
 * Generated from fantasy compendium data for v0.5.6.
 *
 * Format: { "ItemType": { "itemName": "modules/game-icons-net/blackbackground/icon-name.svg" } }
 *
 * Priority: pathMappings → nameMappings → fallbackIconMappings
 * Name-based lookup applies case-insensitive exact matching on item names.
 */
export const nameMappings = {
`;

// Sort types alphabetically for consistency
const types = Object.keys(generated.mappings).sort();

for (let i = 0; i < types.length; i++) {
  const type = types[i];
  const mapping = generated.mappings[type];
  const sortedNames = Object.keys(mapping).sort();

  // Format type header
  const typeKey = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize first letter
  output += `  "${typeKey}": {\n`;

  // Format each name mapping
  for (const name of sortedNames) {
    const icon = mapping[name];
    output += `    "${name}": "${icon}",\n`;
  }

  // Close type object
  output += `  }${i < types.length - 1 ? "," : ""}\n`;
}

output += `};\n`;

// Add fallback mappings section with suggestions for missing types
output += `
/**
 * Generic fallback icons for unmapped items by type.
 * Applied as a final fallback if both pathMappings and nameMappings fail to match.
 */
export const fallbackIconMappings = {
  "Action": "modules/game-icons-net/blackbackground/sword-tie.svg",
  "Ancestry": "modules/game-icons-net/blackbackground/triton-head.svg",
  "Armor": "modules/game-icons-net/blackbackground/acid-shield.svg",
  "ArmorSet": "modules/game-icons-net/blackbackground/armor-upgrade.svg",
  "Edge": "modules/game-icons-net/blackbackground/achievement.svg",
  "Gear": "modules/game-icons-net/blackbackground/backpack.svg",
  "Hindrance": "modules/game-icons-net/blackbackground/sleepy.svg",
  "MagicItem": "modules/game-icons-net/blackbackground/engagement-ring.svg",
  "Power": "modules/game-icons-net/blackbackground/spell-book.svg",
  "Skill": "modules/game-icons-net/blackbackground/tied-scroll.svg",
  "Weapon": "modules/game-icons-net/blackbackground/crossed-swords.svg"
};
`;

// Save output
fs.writeFileSync(outputPath, output);

// Print summary
console.log("\n=== Name Mappings Code Generation ===\n");
console.log(`✓ Generated formatted JavaScript code`);
console.log(`  File: .dev-data/name-mappings-formatted.js\n`);
console.log("Summary:");

const totalMappings = Object.values(generated.mappings).reduce(
  (sum, m) => sum + Object.keys(m).length,
  0
);

console.log(`  Total mappings: ${totalMappings}`);
console.log(`  Types covered: ${types.length}`);
console.log(`  Conflicts resolved: ${generated.stats._total_conflicts || 0}`);

console.log("\nMappings by type:");
for (const type of types) {
  const count = Object.keys(generated.mappings[type]).length;
  console.log(`  ${type.padEnd(12)}: ${count.toString().padStart(3)} entries`);
}

console.log("\n📝 Next: Review the formatted code and paste into icon-mappings.js");
console.log("   Keep existing pathMappings (do not remove!)");
