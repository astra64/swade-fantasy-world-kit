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
 * Read-only; returns plain objects with name, uuid, and any requested `fields`.
 * Results are sorted alphabetically by name.
 *
 * Requests extra fields (e.g. 'system.description') directly from the pack index
 * instead of loading each item's full Document — a single indexed query per pack
 * instead of one document fetch per item, which is what made compendium loading
 * take ~2 seconds for a few dozen items.
 *
 * @param {string} packId - Pack collection ID
 * @param {string} [itemType] - Filter by item type (e.g., 'ancestry', 'skill'). If provided, only returns items matching this type.
 * @param {Array<string>} [fields] - Additional index fields to request (dot-path, e.g. 'system.attribute')
 * @returns {Promise<Array>} Array of {name, uuid, ...fields} objects sorted alphabetically by name
 */
async function fetchPackItems(packId, itemType = null, fields = []) {
  try {
    // Check visibility first; skip pack if not visible to current user
    if (!isPackVisibleToUser(packId)) {
      return [];
    }

    const pack = game.packs.get(packId);
    if (!pack) return [];

    const index = await pack.getIndex({ fields });
    if (!index) return [];

    let items = Array.from(index).map((entry) => {
      const item = { name: entry.name, uuid: entry.uuid, type: entry.type, img: entry.img || '' };
      for (const field of fields) {
        foundry.utils.setProperty(item, field, foundry.utils.getProperty(entry, field));
      }
      return item;
    });

    // Filter by type if specified
    if (itemType) {
      items = items.filter((item) => item.type === itemType);
    }

    // Sort alphabetically by name
    items.sort((a, b) => a.name.localeCompare(b.name));

    return items;
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
 * @param {Array<string>} [fields] - Additional index fields to request (dot-path)
 * @returns {Promise<Array>} Array of {name, uuid, ...fields} objects sorted alphabetically by name
 */
async function fetchPackItemsMulti(packIds, itemType = null, fields = []) {
  const lists = await Promise.all(packIds.map((packId) => fetchPackItems(packId, itemType, fields)));
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
  const items = await fetchPackItemsMulti(
    [FANTASY_PACKS.skills, ...getAdditionalPackIds('additionalSkillPacks')],
    'skill',
    ['system.attribute', 'system.description']
  );

  return items.map((item) => ({
    name: item.name,
    uuid: item.uuid,
    img: item.img || '',
    attribute: item.system?.attribute ?? 'smarts',
    description: item.system?.description ?? '',
  }));
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
  // Requirements are stored as a system DataModel (RequirementsField) with a custom
  // toString() that formats them for display — the compendium index only holds plain
  // serialized data, not model instances, so full Documents are still needed to render
  // requirements correctly. Fetching them one at a time via fromUuid() took ~7ms/item
  // (1.6s+ for ~230 edges); pack.getDocuments() fetches every document in a pack as a
  // single batch operation instead, which is dramatically faster for the same data.
  const packIds = [FANTASY_PACKS.edges, ...getAdditionalPackIds('additionalEdgePacks')];

  const packResults = await Promise.all(packIds.map(async (packId) => {
    if (!isPackVisibleToUser(packId)) return [];
    const pack = game.packs.get(packId);
    if (!pack) return [];
    try {
      return await pack.getDocuments({ type: 'edge' });
    } catch (error) {
      console.warn(`[Character Creation] Failed to batch-fetch edges from ${packId}:`, error);
      return [];
    }
  }));

  const enriched = packResults.flat().map((edgeItem) => ({
    name: edgeItem.name,
    uuid: edgeItem.uuid,
    description: edgeItem.system?.description ?? '',
    img: edgeItem.img || '',
    requirements: Array.isArray(edgeItem.system?.requirements)
      ? edgeItem.system.requirements.map((r) => (typeof r?.toString === 'function' ? r.toString() : '')).filter(Boolean)
      : [],
  }));

  enriched.sort((a, b) => a.name.localeCompare(b.name));
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
  const items = await fetchPackItemsMulti(
    [FANTASY_PACKS.hindrances, ...getAdditionalPackIds('additionalHindrancePacks')],
    'hindrance',
    ['system.major', 'system.severity', 'system.description']
  );

  return items.map((item) => ({
    name: item.name,
    uuid: item.uuid,
    major: item.system?.major ?? false,
    severity: item.system?.severity ?? 'either',
    description: item.system?.description ?? '',
    img: item.img || '',
  }));
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
  const items = await fetchPackItemsMulti(packIds, null, [
    'system.price',
    'system.weight',
    'system.description',
    'system.minStr',
  ]);

  const enriched = items.map((item) => ({
    name: item.name,
    uuid: item.uuid,
    price: item.system?.price ?? 0,
    weight: item.system?.weight ?? 0,
    description: item.system?.description ?? '',
    img: item.img || '',
    type: item.type,
    // Minimum Strength die needed to use this item without penalty (weapons/armor).
    // Not every gear item has one — items without it never trigger the Gear tab's warning.
    minStr: item.system?.minStr || null,
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
