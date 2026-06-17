/**
 * DEVELOPMENT UTILITY (not part of module runtime)
 *
 * Name normalization utilities for icon mapping and fuzzy name matching.
 * Available for future FormApplication features or cross-setting compatibility.
 *
 * Currently not imported/used in the module. Useful for:
 * - Fuzzy name matching in icon remapper UI
 * - Cross-setting item name compatibility (e.g., Eberron vs Fantasy)
 * - Variant normalization in development tools
 *
 * See DEVELOPMENT_TOOLS.md for details.
 *
 * Provides functions to normalize item names and generate variant forms
 * to improve name-based icon matching across different naming conventions.
 *
 * Handles:
 * - Case normalization (lowercase)
 * - Whitespace normalization (trim, collapse internal spaces)
 * - Singular/plural variants (elf/elves, sword/swords)
 * - Hyphenated vs spaced compound names (half-elf vs half elf)
 * - Common abbreviations (longsword vs long sword, crossbow vs cross bow)
 */

/**
 * Normalize an item name to a canonical lowercase form.
 * Applied to both mapping keys and item names for comparison.
 *
 * Rules:
 * - Trim whitespace
 * - Convert to lowercase
 * - Collapse multiple spaces to single space
 * - No other transformations (preserves hyphens, apostrophes, etc.)
 *
 * @param {string} name - Item name to normalize
 * @returns {string} Normalized name
 */
export function normalizeItemName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Generate variant forms of an item name for fuzzy matching.
 * Returns an array of common name variants that might match the item.
 *
 * Useful for handling:
 * - Singular vs plural ("elf" <-> "elves")
 * - Hyphenated vs spaced ("half-elf" <-> "half elf")
 * - Common abbreviations ("long sword" <-> "longsword")
 * - Compound variations ("great sword" <-> "greatsword")
 *
 * @param {string} name - Item name to generate variants for
 * @returns {string[]} Array of normalized variant forms
 */
export function normalizeVariants(name) {
  const normalized = normalizeItemName(name);
  const variants = new Set([normalized]);

  // Variant 1: Singular/Plural transformations
  // elf ↔ elves, dragon ↔ dragons, etc.
  if (normalized.endsWith("ves")) {
    variants.add(normalized.slice(0, -3) + "f");
  }
  if (normalized.endsWith("f")) {
    variants.add(normalized + "ves");
  }
  if (normalized.endsWith("es") && !normalized.endsWith("ss")) {
    variants.add(normalized.slice(0, -2));
  }
  if (
    !normalized.endsWith("s") &&
    !normalized.endsWith("ss") &&
    !normalized.endsWith("us")
  ) {
    variants.add(normalized + "s");
  }

  // Variant 2: Hyphen ↔ Space transformations
  // "half-elf" ↔ "half elf", "great-sword" ↔ "great sword"
  if (normalized.includes("-")) {
    variants.add(normalized.replace(/-/g, " "));
  }
  if (normalized.includes(" ")) {
    variants.add(normalized.replace(/ /g, "-"));
  }

  // Variant 3: No-space compound forms
  // "long sword" ↔ "longsword", "cross bow" ↔ "crossbow"
  if (normalized.includes(" ")) {
    const nospaced = normalized.replace(/\s+/g, "");
    variants.add(nospaced);

    // Also try hyphenated version of no-space form
    variants.add(nospaced.replace(/([a-z])([a-z])/g, "$1-$2"));
  }

  // Variant 4: Common compound word variations
  // "great-axe" → "greataxe", "great sword" → "greatsword"
  const compoundPatterns = [
    ["great ", "great-"],
    ["long ", "long-"],
    ["short ", "short-"],
    ["heavy ", "heavy-"],
    ["light ", "light-"],
    ["cross ", "cross-"],
    ["hand ", "hand-"],
  ];

  for (const [pattern1, pattern2] of compoundPatterns) {
    if (normalized.includes(pattern1)) {
      variants.add(normalized.replace(pattern1, pattern2));
      variants.add(normalized.replace(pattern1, ""));
    }
    if (normalized.includes(pattern2)) {
      variants.add(normalized.replace(pattern2, pattern1));
      variants.add(normalized.replace(pattern2, ""));
    }
  }

  // Variant 5: Remove/restore common parenthetical notations
  // "Riding (skill)" → "riding", "(Specialization)" → "specialization"
  if (normalized.includes("(")) {
    variants.add(normalized.replace(/\s*\([^)]*\)\s*/g, ""));
  }

  return Array.from(variants).filter((v) => v.length > 0);
}

/**
 * Find a matching name in a set of available names using normalization.
 * Useful for mapping item names to icon mappings with fuzzy matching.
 *
 * @param {string} itemName - The item name to look up
 * @param {string[]} availableNames - Set of names to search in (should be normalized)
 * @returns {string|null} Matching name from availableNames, or null if not found
 */
export function findMatchingName(itemName, availableNames) {
  const normalized = normalizeItemName(itemName);

  // Try exact match first
  if (availableNames.includes(normalized)) {
    return normalized;
  }

  // Try variants
  const variants = normalizeVariants(itemName);
  for (const variant of variants) {
    if (availableNames.includes(variant)) {
      return variant;
    }
  }

  return null;
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeItemName,
    normalizeVariants,
    findMatchingName
  };
}
