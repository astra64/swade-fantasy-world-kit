/**
 * Compendium Utilities - Read-only access to Fantasy compendiums
 *
 * Used by character creation and advancement tools.
 * No write operations. No side effects.
 */

/**
 * Get all ancestries from curated compendium.
 * Read-only; returns plain objects.
 */
export async function getAncestries() {
  const pack = game.packs.get('swade-fantasy-world-kit.ancestries-fantasy');
  if (!pack) return [];
  
  const index = await pack.getIndex();
  return Array.from(index).map((entry) => ({
    name: entry.name,
    uuid: entry.uuid,
  }));
}

/**
 * Get all skills from curated compendium.
 * Read-only; returns plain objects.
 */
export async function getSkills() {
  const pack = game.packs.get('swade-fantasy-world-kit.skills-fantasy');
  if (!pack) return [];
  
  const index = await pack.getIndex();
  return Array.from(index).map((entry) => ({
    name: entry.name,
    uuid: entry.uuid,
  }));
}

/**
 * Get all edges from curated compendium.
 * Read-only; returns plain objects.
 */
export async function getEdges() {
  const pack = game.packs.get('swade-fantasy-world-kit.edges-fantasy');
  if (!pack) return [];
  
  const index = await pack.getIndex();
  return Array.from(index).map((entry) => ({
    name: entry.name,
    uuid: entry.uuid,
  }));
}

/**
 * Get all hindrances from curated compendium.
 * Read-only; returns plain objects.
 */
export async function getHindrances() {
  const pack = game.packs.get('swade-fantasy-world-kit.hindrances-fantasy');
  if (!pack) return [];
  
  const index = await pack.getIndex();
  return Array.from(index).map((entry) => ({
    name: entry.name,
    uuid: entry.uuid,
  }));
}

/**
 * Get single item by UUID (read-only preview, not for import).
 */
export async function getItemPreview(uuid) {
  return await fromUuid(uuid);
}
