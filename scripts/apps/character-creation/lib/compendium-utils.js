/**
 * Compendium Utilities - Read-only access to Fantasy compendiums
 *
 * Used by character creation and advancement tools.
 * No write operations. No side effects.
 *
 * Optional filtering: Respects module's curated visibility settings if available.
 * If filtering is unavailable or curated mode is off, returns unfiltered data.
 */

const MODULE_ID = "swade-fantasy-world-kit";

// Curated Fantasy pack identifiers (read-only)
const FANTASY_PACKS = {
  ancestries: `${MODULE_ID}.ancestries-fantasy`,
  skills: `${MODULE_ID}.skills-fantasy`,
  edges: `${MODULE_ID}.edges-fantasy`,
  hindrances: `${MODULE_ID}.hindrances-fantasy`,
  actions: `${MODULE_ID}.actions-fantasy`,
  gear: `${MODULE_ID}.gear-fantasy`,
  weapons: `${MODULE_ID}.weapons-fantasy`,
  armor: `${MODULE_ID}.armor-and-shields-fantasy`,
  magicItems: `${MODULE_ID}.magic-items-fantasy`,
  powers: `${MODULE_ID}.powers-fantasy`,
  armorSets: `${MODULE_ID}.armor-sets-fantasy`,
  pregens: `${MODULE_ID}.pregens-fantasy`,
};

/**
 * Check if a pack is visible to the current user based on curated mode settings.
 * Gracefully handles missing settings (returns true if settings unavailable).
 * 
 * @param {string} packId - Pack collection ID (e.g., "module.pack-name")
 * @param {User} [user] - User to check; defaults to game.user
 * @returns {boolean} True if pack is visible to user
 */
function isPackVisibleToUser(packId, user = null) {
  try {
    const effectiveUser = user ?? game.user;
    if (!effectiveUser) return true; // No user context; allow access

    // Check if curated mode is enabled
    const curatedMode = game.settings?.get?.(MODULE_ID, "curatedMode");
    if (!curatedMode) return true; // Curated mode off; all packs visible

    // GM with override sees all packs
    if (effectiveUser.isGM) {
      const gmSeesAllPacks = game.settings?.get?.(MODULE_ID, "gmSeesAllPacks");
      if (gmSeesAllPacks) return true;
    }

    // Check if pack is in extra visible packs allowlist
    const extraVisiblePacksStr = game.settings?.get?.(MODULE_ID, "extraVisiblePacks") ?? "";
    const extraVisiblePacks = new Set(
      extraVisiblePacksStr
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );

    return extraVisiblePacks.has(packId);
  } catch (error) {
    // On error (settings not ready), gracefully allow access
    console.debug("[Character Creation] Filtering unavailable; allowing pack access:", packId);
    return true;
  }
}

/**
 * Fetch items from a compendium pack, with optional filtering.
 * Read-only; returns plain objects with name and uuid.
 * Results are sorted alphabetically by name.
 * 
 * @param {string} packId - Pack collection ID
 * @param {string} [itemType] - Filter by item type (e.g., 'ancestry', 'skill'). If provided, only returns items matching this type.
 * @returns {Promise<Array>} Array of {name, uuid} objects sorted alphabetically by name
 */
async function fetchPackItems(packId, itemType = null) {
  try {
    // Check visibility first; skip pack if not visible to current user
    if (!isPackVisibleToUser(packId)) {
      return [];
    }

    const pack = game.packs.get(packId);
    if (!pack) return [];

    const index = await pack.getIndex();
    if (!index) return [];

    let items = Array.from(index).map((entry) => ({
      name: entry.name,
      uuid: entry.uuid,
      type: entry.type, // Include type for filtering
    }));

    // Filter by type if specified
    if (itemType) {
      items = items.filter((item) => item.type === itemType);
    }

    // Sort alphabetically by name
    items.sort((a, b) => a.name.localeCompare(b.name));

    // Return only name and uuid (remove type from output)
    return items.map((item) => ({ name: item.name, uuid: item.uuid }));
  } catch (error) {
    console.warn(`[Character Creation] Failed to fetch pack ${packId}:`, error);
    return [];
  }
}

/**
 * Get all ancestries from curated compendium.
 * Filters to type='ancestry' to exclude child abilities.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects.
 * 
 * @returns {Promise<Array>} Array of {name, uuid} objects
 */
export async function getAncestries() {
  return fetchPackItems(FANTASY_PACKS.ancestries, 'ancestry');
}

/**
 * Get all skills from curated compendium.
 * Filters to type='skill'.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects.
 * 
 * @returns {Promise<Array>} Array of {name, uuid} objects
 */
export async function getSkills() {
  return fetchPackItems(FANTASY_PACKS.skills, 'skill');
}

/**
 * Get all edges from curated compendium.
 * Filters to type='edge'.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects.
 * 
 * @returns {Promise<Array>} Array of {name, uuid} objects
 */
export async function getEdges() {
  return fetchPackItems(FANTASY_PACKS.edges, 'edge');
}

/**
 * Get all hindrances from curated compendium.
 * Filters to type='hindrance'.
 * Fetches full item data to include Major/Minor flag (system.major).
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects with metadata.
 *
 * @returns {Promise<Array>} Array of {name, uuid, major, description} objects sorted alphabetically
 */
export async function getHindrances() {
  const basicItems = await fetchPackItems(FANTASY_PACKS.hindrances, 'hindrance');

  // Fetch full item data in parallel to get system.major flag
  const enriched = await Promise.all(basicItems.map(async (item) => {
    try {
      const fullItem = await getItemPreview(item.uuid);
      if (fullItem) {
        return {
          name: fullItem.name,
          uuid: fullItem.uuid,
          major: fullItem.system?.major ?? false,
          description: fullItem.system?.description ?? '',
          img: fullItem.img || '',
        };
      }
    } catch (error) {
      console.warn(`[Character Creation] Failed to fetch hindrance ${item.uuid}:`, error);
    }
    // Fall back to basic info if full fetch fails
    return {
      name: item.name,
      uuid: item.uuid,
      major: false,
      description: '',
      img: '',
    };
  }));

  return enriched;
}

/**
 * Get single item by UUID (read-only preview, not for import).
 * Safe for pulling full item details for display purposes.
 * 
 * @param {string} uuid - Item UUID
 * @returns {Promise<Object|null>} Item object or null if not found
 */
export async function getItemPreview(uuid) {
  try {
    const item = await fromUuid(uuid);
    return item ?? null;
  } catch (error) {
    console.warn(`[Character Creation] Failed to fetch item preview for ${uuid}:`, error);
    return null;
  }
}

/**
 * Get metadata (name, uuid) for multiple items by UUID.
 * Used for bulk operations like ancestry/skill/edge/hindrance selection.
 * 
 * @param {Array<string>} uuids - Array of item UUIDs
 * @returns {Promise<Array>} Array of {name, uuid} objects (skips invalid UUIDs)
 */
export async function getItemsByUuids(uuids) {
  if (!Array.isArray(uuids) || uuids.length === 0) return [];

  const results = [];
  for (const uuid of uuids) {
    try {
      const item = await fromUuid(uuid);
      if (item) {
        results.push({
          name: item.name,
          uuid: uuid,
        });
      }
    } catch (error) {
      console.debug(`[Character Creation] Skipping invalid UUID: ${uuid}`);
    }
  }
  return results;
}
