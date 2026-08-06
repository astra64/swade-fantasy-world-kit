/**
 * Character Creation Tools - Public API
 *
 * Isolated module for building out an existing SWADE actor's ancestry/skills/edges/
 * hindrances/gear and for advancement. Both tools edit an existing actor only — neither
 * creates a new actor document.
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
import { AdvancementManager } from './AdvancementManager.js';

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
  //   new AdvancementManager({ actor }).render(true);

  console.log('[Character Creation Tools] Initialized');
}

export { CharacterManager, AdvancementManager, invalidateCompendiumCache };
