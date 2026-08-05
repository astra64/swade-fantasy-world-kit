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
 * Read a comma/semicolon/whitespace-separated pack ID list from a module setting.
 * Used to merge GM-added compendiums (e.g. a homebrew supplement) into Character Manager's
 * built-in Fantasy pack lists, without replacing them. Returns [] if the setting isn't
 * registered yet or is empty — additional packs are opt-in, never required.
 *
 * @param {string} settingKey - Module setting key holding the pack ID list
 * @returns {Array<string>} Pack IDs
 */
function getAdditionalPackIds(settingKey) {
  try {
    const raw = game.settings?.get?.(MODULE_ID, settingKey) ?? "";
    return raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } catch (error) {
    return [];
  }
}

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
 * Fetch items of a given type from several packs at once and merge into one sorted list —
 * used to combine a built-in Fantasy pack with any GM-configured additional packs.
 *
 * @param {Array<string>} packIds - Pack collection IDs
 * @param {string} [itemType] - Filter by item type
 * @returns {Promise<Array>} Array of {name, uuid} objects sorted alphabetically by name
 */
async function fetchPackItemsMulti(packIds, itemType = null) {
  const lists = await Promise.all(packIds.map((packId) => fetchPackItems(packId, itemType)));
  const items = lists.flat();
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

/**
 * Get all ancestries from curated + any GM-configured additional compendiums.
 * Filters to type='ancestry' to exclude child abilities.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects.
 *
 * @returns {Promise<Array>} Array of {name, uuid} objects
 */
export async function getAncestries() {
  return fetchPackItemsMulti([FANTASY_PACKS.ancestries, ...getAdditionalPackIds('additionalAncestryPacks')], 'ancestry');
}

/**
 * Get all skills from curated compendium.
 * Filters to type='skill'.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects.
 * 
 * @returns {Promise<Array>} Array of {name, uuid} objects
 */
/**
 * Get all skills from curated compendium.
 * Filters to type='skill'.
 * Fetches full item data to include linked attribute (system.attribute) and description.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects with metadata.
 *
 * @returns {Promise<Array>} Array of {name, uuid, attribute, description} objects sorted alphabetically
 */
export async function getSkills() {
  const basicItems = await fetchPackItemsMulti([FANTASY_PACKS.skills, ...getAdditionalPackIds('additionalSkillPacks')], 'skill');

  // Fetch full item data in parallel to get system.attribute and description
  const enriched = await Promise.all(basicItems.map(async (item) => {
    try {
      const fullItem = await getItemPreview(item.uuid);
      if (fullItem) {
        return {
          name: fullItem.name,
          uuid: fullItem.uuid,
          attribute: fullItem.system?.attribute ?? 'smarts',
          description: fullItem.system?.description ?? '',
        };
      }
      return item;
    } catch (error) {
      console.warn(`[Character Creation] Failed to fetch skill ${item.name}:`, error);
      return item;
    }
  }));

  return enriched.filter(skill => skill);
}

/**
 * Get all edges from curated compendium.
 * Filters to type='edge'.
 * Fetches full item data to include description, image, and requirements.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects with metadata.
 *
 * @returns {Promise<Array>} Array of {name, uuid, description, img, requirements} objects sorted alphabetically
 */
export async function getEdges() {
  const basicItems = await fetchPackItemsMulti([FANTASY_PACKS.edges, ...getAdditionalPackIds('additionalEdgePacks')], 'edge');

  const enriched = await Promise.all(basicItems.map(async (item) => {
    try {
      const fullItem = await getItemPreview(item.uuid);
      if (fullItem) {
        return {
          name: fullItem.name,
          uuid: fullItem.uuid,
          description: fullItem.system?.description ?? '',
          img: fullItem.img || '',
          requirements: Array.isArray(fullItem.system?.requirements)
            ? fullItem.system.requirements.map((r) => (typeof r?.toString === 'function' ? r.toString() : '')).filter(Boolean)
            : [],
        };
      }
    } catch (error) {
      console.warn(`[Character Creation] Failed to fetch edge ${item.uuid}:`, error);
    }
    return {
      name: item.name,
      uuid: item.uuid,
      description: '',
      img: '',
      requirements: [],
    };
  }));

  return enriched;
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
  const basicItems = await fetchPackItemsMulti([FANTASY_PACKS.hindrances, ...getAdditionalPackIds('additionalHindrancePacks')], 'hindrance');

  // Fetch full item data in parallel to get system.major flag
  const enriched = await Promise.all(basicItems.map(async (item) => {
    try {
      const fullItem = await getItemPreview(item.uuid);
      if (fullItem) {
        return {
          name: fullItem.name,
          uuid: fullItem.uuid,
          major: fullItem.system?.major ?? false,
          severity: fullItem.system?.severity ?? 'either',
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
 * Get all starting-equipment items (gear, weapons, armor & shields) from curated
 * compendiums. Fetches full item data to include price, weight, image, and description.
 * Respects curated visibility settings if enabled.
 * Read-only; returns plain objects with metadata.
 *
 * @returns {Promise<Array>} Array of {name, uuid, price, weight, description, img, type, minStr} objects sorted alphabetically
 */
export async function getGearItems() {
  const packIds = [
    FANTASY_PACKS.gear,
    FANTASY_PACKS.weapons,
    FANTASY_PACKS.armor,
    ...getAdditionalPackIds("additionalGearPacks"),
  ];
  const basicItems = await fetchPackItemsMulti(packIds);

  const enriched = await Promise.all(basicItems.map(async (item) => {
    try {
      const fullItem = await getItemPreview(item.uuid);
      if (fullItem) {
        return {
          name: fullItem.name,
          uuid: fullItem.uuid,
          price: fullItem.system?.price ?? 0,
          weight: fullItem.system?.weight ?? 0,
          description: fullItem.system?.description ?? '',
          img: fullItem.img || '',
          type: fullItem.type,
          // Minimum Strength die needed to use this item without penalty (weapons/armor).
          // Not every gear item has one — items without it never trigger the Gear tab's warning.
          minStr: fullItem.system?.minStr || null,
        };
      }
    } catch (error) {
      console.warn(`[Character Creation] Failed to fetch gear item ${item.uuid}:`, error);
    }
    return { name: item.name, uuid: item.uuid, price: 0, weight: 0, description: '', img: '', type: '' };
  }));

  enriched.sort((a, b) => a.name.localeCompare(b.name));
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
