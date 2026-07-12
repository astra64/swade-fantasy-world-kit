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

export function createIconRemapper(pathMappings, nameMappings, fallbackMappings) {
  return function getRemappedIcon(item) {
    if (!item) return null;

    const currentIcon = normalizeIconPath(item.img);
    if (!currentIcon) return null;

    // Step 1: Check name-based soft lookup first (match by item name and type)
    // Curated/specific item names take priority over generic system icons
    const typeMapping = getTypeMapping(nameMappings, item.type);
    if (typeMapping) {
      const nameKey = Object.keys(typeMapping).find(
        (key) => key.toLowerCase() === String(item.name ?? "").trim().toLowerCase()
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
    const fallbackIcon = getTypeMapping(fallbackMappings, item.type);
    if (fallbackIcon) {
      return fallbackIcon;
    }

    return null;
  };
}

