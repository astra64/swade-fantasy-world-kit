/**
 * Test launcher for Character Manager
 * Run in Foundry console with: await import('/modules/swade-fantasy-world-kit/scripts/apps/character-creation/test-launcher.js').then(m => m.launchCharacterManager());
 */

export async function launchCharacterManager() {
  console.log('[CharacterManager] Launch test starting...');

  try {
    console.log('[CharacterManager] Attempting to create instance...');
    const mgr = new window.CharacterManager();
    console.log('[CharacterManager] Instance created:', mgr);
    console.log('[CharacterManager] Template:', mgr.options.template);
    console.log('[CharacterManager] ID:', mgr.options.id);

    console.log('[CharacterManager] Calling render(true)...');
    await mgr.render(true);
    console.log('[CharacterManager] render() completed');

  } catch (e) {
    console.error('[CharacterManager] Fatal error:', e);
    console.error('[CharacterManager] Stack:', e.stack);
    ui.notifications.error(`[Character Manager] Error: ${e.message}`);
  }
}

// For direct console testing
window.testCharacterManager = launchCharacterManager;
console.log('[CharacterManager] Test launcher loaded. Run: testCharacterManager()');
