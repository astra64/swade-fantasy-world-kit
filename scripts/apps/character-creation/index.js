/**
 * Character Creation Tools - Public API
 *
 * Isolated module for SWADE character creation and advancement.
 * No dependencies on preset system or icon remapper.
 * Read-only access to compendiums.
 */

import { CharacterCreator } from './CharacterCreator.js';
import { AdvancementManager } from './AdvancementManager.js';

/**
 * Factory to create and register character creation UI.
 * Called from scripts/main.js during module init.
 */
export function setupCharacterCreationTools() {
  // TODO: Hook registration and settings menu integration
  console.log('[Character Creation Tools] Initialized (stub)');
}

export { CharacterCreator, AdvancementManager };
