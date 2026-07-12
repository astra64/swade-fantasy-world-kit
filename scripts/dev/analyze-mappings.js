#!/usr/bin/env node

/**
 * DEVELOPMENT TOOL (not part of module runtime)
 *
 * Analyze compendium items to identify mapping coverage and unmapped icons.
 *
 * Usage: node scripts/dev/analyze-mappings.js
 * Input:  .dev-data/compendium-items.json
 * Output: Console report + .dev-data/mapping-analysis.json
 *
 * See DEVELOPMENT_TOOLS.md for full workflow.
 */

const fs = require("fs");
const path = require("path");

const data = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../.dev-data/compendium-items.json"),
    "utf-8"
  )
);

// Load current icon mappings
const mappings = require("../lib/icon-mappings.js");

const analysis = {
  timestamp: new Date().toISOString(),
  summary: {},
  unmappedPaths: new Map(),
  systemIconItems: [],
  nameBasedMappingCandidates: {}
};

function getTypeMapping(mappingTable, itemType) {
  if (!mappingTable || !itemType) return null;

  const normalizedType = String(itemType).trim().toLowerCase();
  if (!normalizedType) return null;

  const directMatch = mappingTable[itemType];
  if (directMatch) return directMatch;

  const matchedKey = Object.keys(mappingTable).find(
    (key) => String(key).trim().toLowerCase() === normalizedType
  );

  return matchedKey ? mappingTable[matchedKey] : null;
}

function normalizeIconPath(iconPath) {
  if (!iconPath) return iconPath;
  return String(iconPath).trim();
}

function normalizeItemName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hasNameMapping(item) {
  const typeMapping = getTypeMapping(mappings.nameMappings, item.type);
  if (!typeMapping) return false;

  const itemName = normalizeItemName(item.name);
  return Object.keys(typeMapping).some(
    (key) => normalizeItemName(key) === itemName
  );
}

// Analyze each pack
for (const [packName, packData] of Object.entries(data.packs)) {
  const itemCount = packData.count;
  const items = packData.items || [];

  analysis.summary[packName] = {
    total: itemCount,
    systemIcons: 0,
    unmappedPaths: 0,
    mapped: 0
  };

  for (const item of items) {
    const icon = normalizeIconPath(item.img);

    // Check if runtime can already remap by name regardless of source path.
    if (hasNameMapping(item)) {
      analysis.summary[packName].mapped++;
      continue;
    }

    // Check if using system icon
    if (icon.startsWith("systems/")) {
      analysis.summary[packName].systemIcons++;
      analysis.systemIconItems.push({
        pack: packName,
        name: item.name,
        icon: item.img,
        type: item.type
      });
      continue;
    }

    // Check if path is in pathMappings
    if (mappings.pathMappings[icon]) {
      analysis.summary[packName].mapped++;
      continue;
    }

    // Check if path is game-icons-net
    if (icon.includes("game-icons-net")) {
      analysis.summary[packName].mapped++;
      continue;
    }

    // Unmapped path
    analysis.summary[packName].unmappedPaths++;
    if (!analysis.unmappedPaths.has(icon)) {
      analysis.unmappedPaths.set(icon, []);
    }
    analysis.unmappedPaths.get(icon).push({
      pack: packName,
      name: item.name,
      type: item.type
    });
  }

  // Generate name-based mapping candidates
  for (const item of items) {
    if (!analysis.nameBasedMappingCandidates[item.type]) {
      analysis.nameBasedMappingCandidates[item.type] = {};
    }
    if (item.img.includes("game-icons-net")) {
      const nameLower = (item.name || "").toLowerCase();
      if (nameLower && !analysis.nameBasedMappingCandidates[item.type][nameLower]) {
        analysis.nameBasedMappingCandidates[item.type][nameLower] = item.img;
      }
    }
  }
}

// Output report
console.log("\n=== v0.5.6 Icon Mapping Analysis ===\n");

console.log("Summary by Pack:");
let totalItems = 0;
let totalMapped = 0;
let totalSystem = 0;
let totalUnmapped = 0;

for (const [packName, stats] of Object.entries(analysis.summary)) {
  totalItems += stats.total;
  totalMapped += stats.mapped;
  totalSystem += stats.systemIcons;
  totalUnmapped += stats.unmappedPaths;

  const pct = ((stats.mapped / stats.total) * 100).toFixed(1);
  console.log(`  ${packName}: ${stats.mapped}/${stats.total} (${pct}%) - System: ${stats.systemIcons}, Unmapped: ${stats.unmappedPaths}`);
}

console.log(`\nTotals: ${totalMapped}/${totalItems} (${((totalMapped / totalItems) * 100).toFixed(1)}%)`);
console.log(`  System icons still in use: ${totalSystem}`);
console.log(`  Unmapped paths: ${totalUnmapped}`);

if (analysis.systemIconItems.length > 0) {
  console.log(`\n=== Items Using System Icons (${analysis.systemIconItems.length}) ===`);
  const byType = {};
  for (const item of analysis.systemIconItems) {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  }
  for (const [type, items] of Object.entries(byType)) {
    console.log(`\n${type}:`);
    items.slice(0, 5).forEach(item => {
      console.log(`  - ${item.name} (${item.pack})`);
    });
    if (items.length > 5) console.log(`  ... and ${items.length - 5} more`);
  }
}

if (analysis.unmappedPaths.size > 0) {
  console.log(`\n=== Unmapped Paths (${analysis.unmappedPaths.size}) ===`);
  let count = 0;
  for (const [path, items] of analysis.unmappedPaths) {
    console.log(`\n  Path: ${path}`);
    console.log(`    Items: ${items.map(i => `${i.name} (${i.pack})`).join(", ")}`);
    if (++count >= 10) {
      console.log(`  ... and ${analysis.unmappedPaths.size - count} more unmapped paths`);
      break;
    }
  }
}

// Save detailed analysis
const detailedAnalysis = {
  ...analysis,
  systemIconItems: analysis.systemIconItems,
  unmappedPaths: Array.from(analysis.unmappedPaths.entries()).map(([path, items]) => ({
    path,
    items
  }))
};

fs.writeFileSync(
  path.join(__dirname, "../../.dev-data/mapping-analysis.json"),
  JSON.stringify(detailedAnalysis, null, 2)
);

console.log("\n✓ Detailed analysis saved to mapping-analysis.json");
