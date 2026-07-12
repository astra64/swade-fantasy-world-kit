/**
 * SWADE Fantasy World Kit - Character Manager Macro
 * 
 * Unified macro for character creation and advancement.
 * Copy this entire script into a Foundry macro for quick access.
 * Usage: Create a new "Script" macro and paste this code into it.
 * 
 * Workflow:
 * - If no actor selected: Creates a blank actor and opens Character Manager
 * - If actor selected: Opens Character Manager for that actor (creation or advancement)
 * 
 * Quick hotbar button: Click to manage character
 */

// Try to get selected actor (from token or user character)
const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;

if (!actor) {
  // No actor selected - create a new blank actor for character creation
  try {
    const newActor = await Actor.create({
      name: "New Character",
      type: "character",
      data: {}
    });
    
    const manager = new window.CharacterManager(newActor);
    manager.render(true);
    
    ui.notifications.info(`[SWADE FWK] Created new character. Open Character Manager to build them out.`);
    console.log(`[SWADE FWK] Character Manager opened for new actor: ${newActor.name}`);
  } catch (error) {
    ui.notifications.error(`[SWADE FWK] Failed to create new actor: ${error.message}`);
    console.error("[SWADE FWK] Error:", error);
  }
} else {
  // Actor selected - open Character Manager for that actor (creation or advancement)
  const manager = new window.CharacterManager(actor);
  manager.render(true);
  
  console.log(`[SWADE FWK] Character Manager opened for ${actor.name}`);
}
