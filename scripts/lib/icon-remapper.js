/**
 * Icon remapper factory - creates a function that applies icon mappings to items.
 *
 * Remapping priority:
 * 1. Name-based soft lookup (item name match within type) - curated/specific icons take priority
 * 2. Path-based mappings (exact match on source icon path) - generic system/companion icons
 * 3. Fallback icon by type (generic default)
 */

/**
 * Creates an icon remapping function that applies mappings to an item.
 *
 * @param {Object} pathMappings - Maps source icon paths to target URLs
 * @param {Object} nameMappings - Maps item names to target URLs by type
 * @param {Object} fallbackMappings - Maps item types to default fallback icons
 * @returns {Function} Function that takes an item and returns new icon (or null if no mapping)
 */
export function createIconRemapper(pathMappings, nameMappings, fallbackMappings) {
  return function getRemappedIcon(item) {
    if (!item) return null;

    const currentIcon = item.img;
    if (!currentIcon) return null;

    // Step 1: Check name-based soft lookup first (match by item name and type)
    // Curated/specific item names take priority over generic system icons
    if (nameMappings && item.type && nameMappings[item.type]) {
      const typeMapping = nameMappings[item.type];
      const nameKey = Object.keys(typeMapping).find(
        (key) => key.toLowerCase() === (item.name ?? "").toLowerCase()
      );
      if (nameKey) {
        return typeMapping[nameKey];
      }
    }

    // Step 2: Check path-based mappings (exact match on source icon path)
    // Fallback for items without specific name mappings
    if (pathMappings && pathMappings[currentIcon]) {
      return pathMappings[currentIcon];
    }

    // Step 3: Check fallback icon by type
    if (fallbackMappings && item.type && fallbackMappings[item.type]) {
      return fallbackMappings[item.type];
    }

    return null;
  };
}

