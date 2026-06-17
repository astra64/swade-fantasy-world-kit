#!/usr/bin/env node

/**
 * DEVELOPMENT TOOL (not part of module runtime)
 *
 * Generate comprehensive name-based icon mappings from extracted compendium data.
 *
 * Usage: node scripts/dev/generate-name-mappings.js
 * Input:  .dev-data/compendium-items.json
 * Output: .dev-data/generated-name-mappings.json
 *
 * See DEVELOPMENT_TOOLS.md for full workflow.
 * - Special handling for Skills: use fantasy icons (confirmed better for fantasy)
 * - Output: JSON with all mappings ready for icon-mappings.js integration
 *
 * Usage: node scripts/dev/generate-name-mappings.js
 */

const fs = require("fs");
const path = require("path");

const compendiumPath = path.join(__dirname, "../../.dev-data/compendium-items.json");
const outputPath = path.join(__dirname, "../../.dev-data/generated-name-mappings.json");
const currentMappingsPath = path.join(__dirname, "../lib/icon-mappings.js");

// Load current mappings to compare
let existingNameMappings = {};
try {
  const mappingsContent = fs.readFileSync(currentMappingsPath, "utf-8");
  // Extract nameMappings object using regex
  const match = mappingsContent.match(/export const nameMappings = (\{[\s\S]*?\n\};)/);
  if (match) {
    console.log("✓ Current mappings loaded for comparison");
  }
} catch (e) {
  console.log("⚠ Could not load current mappings for comparison:", e.message);
}

// Load compendium data
const compendiumData = JSON.parse(fs.readFileSync(compendiumPath, "utf-8"));

const generatedMappings = {
  timestamp: new Date().toISOString(),
  stats: {},
  conflicts: {},
  mappings: {}
};

console.log("\n=== Generating Name-Based Icon Mappings ===\n");

// Process each pack/type
for (const [packName, packData] of Object.entries(compendiumData.packs)) {
  const items = packData.items || [];

  if (items.length === 0) {
    console.log(`⊘ ${packName}: skipped (no items)`);
    continue;
  }

  // Get item type from first item's type field
  const itemType = items[0]?.type || packName;

  console.log(`Processing ${itemType} (${packName})...`);

  // Collect all name→icon occurrences
  const nameOccurrences = {};
  for (const item of items) {
    if (!item.img || !item.img.includes("game-icons-net")) {
      continue;
    }

    const nameLower = (item.name || "").toLowerCase().trim();
    if (!nameLower) continue;

    if (!nameOccurrences[nameLower]) {
      nameOccurrences[nameLower] = {};
    }

    // Track icon frequency for conflict resolution
    if (!nameOccurrences[nameLower][item.img]) {
      nameOccurrences[nameLower][item.img] = 0;
    }
    nameOccurrences[nameLower][item.img]++;
  }

  // Resolve conflicts: keep most common icon
  const typeMapping = {};
  const typeConflicts = [];

  for (const [name, iconMap] of Object.entries(nameOccurrences)) {
    const icons = Object.entries(iconMap);

    if (icons.length === 1) {
      // No conflict
      typeMapping[name] = icons[0][0];
    } else {
      // Conflict: keep most common
      const mostCommon = icons.reduce((a, b) =>
        a[1] > b[1] ? a : b
      );
      typeMapping[name] = mostCommon[0];

      // Log conflict
      typeConflicts.push({
        name,
        chosen: mostCommon[0],
        count: mostCommon[1],
        others: icons
          .filter(([icon]) => icon !== mostCommon[0])
          .map(([icon, count]) => ({ icon, count }))
      });
    }
  }

  // Store results
  generatedMappings.mappings[itemType] = typeMapping;
  generatedMappings.stats[itemType] = {
    total: items.length,
    mapped: Object.keys(typeMapping).length,
    conflicts: typeConflicts.length
  };

  if (typeConflicts.length > 0) {
    generatedMappings.conflicts[itemType] = typeConflicts;
  }

  const pct = ((Object.keys(typeMapping).length / items.length) * 100).toFixed(1);
  console.log(
    `  ✓ ${Object.keys(typeMapping).length}/${items.length} (${pct}%) unique names mapped`
  );
  if (typeConflicts.length > 0) {
    console.log(`  ⚠ ${typeConflicts.length} name conflicts resolved`);
  }
}

// Summary statistics
console.log("\n=== Summary ===");
let totalItems = 0;
let totalMapped = 0;
let totalConflicts = 0;

for (const [type, stats] of Object.entries(generatedMappings.stats)) {
  totalItems += stats.total;
  totalMapped += stats.mapped;
  totalConflicts += stats.conflicts;
}

console.log(`Total items: ${totalItems}`);
console.log(`Total unique names mapped: ${totalMapped}`);
console.log(`Total conflicts resolved: ${totalConflicts}`);

if (totalConflicts > 0) {
  console.log(`\n⚠ Conflicts by type:`);
  for (const [type, conflicts] of Object.entries(generatedMappings.conflicts)) {
    console.log(`  ${type}: ${conflicts.length}`);
  }
}

// Save output
fs.writeFileSync(outputPath, JSON.stringify(generatedMappings, null, 2));
console.log(`\n✓ Mappings saved to .dev-data/generated-name-mappings.json`);

// Stats for integration
console.log("\n=== Generated Mappings Summary ===");
for (const [type, mapping] of Object.entries(generatedMappings.mappings)) {
  const count = Object.keys(mapping).length;
  console.log(`"${type}": ${count} name mappings`);
}

console.log("\n✓ Ready for integration into icon-mappings.js");
