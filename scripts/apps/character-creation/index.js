/**
 * Character Creation Tools - Public API
 *
 * Isolated module for building out an existing SWADE actor's ancestry/skills/edges/
 * hindrances/gear/advancement, all via CharacterManager's tabs. Edits an existing actor
 * only — it doesn't create a new actor document.
 * No dependencies on preset system or icon remapper.
 * Read-only access to compendiums.
 *
 * Usage:
 *   // In module init hook:
 *   import { setupCharacterCreationTools } from './apps/character-creation/index.js';
 *   setupCharacterCreationTools();
 *
 *   // To open character manager for an existing actor:
 *   const manager = new CharacterManager({ actor });
 *   manager.render(true);
 */

import { CharacterManager, invalidateCompendiumCache } from './CharacterManager.js';

/**
 * Factory to create and register character creation UI.
 * Called from scripts/main.js during module init.
 *
 * Currently a placeholder; full integration deferred to v0.6.2+ phase.
 * In future: Will register settings menu entries, keyboard shortcuts, etc.
 */
export function setupCharacterCreationTools() {
  // TODO: Register settings menu entries and global access points
  // For now, available via direct instantiation:
  //   const manager = new CharacterManager({ actor });

  console.log('[Character Creation Tools] Initialized');
}

export { CharacterManager, invalidateCompendiumCache };
