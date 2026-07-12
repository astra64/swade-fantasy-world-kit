/**
 * Character Creator - FormApplication for SWADE character generation
 *
 * Features:
 * - Ancestry/skill/edge/hindrance selection from curated compendiums
 * - Inline attribute calculation
 * - Export character as actor or JSON
 */

export class CharacterCreator extends FormApplication {
  constructor(options = {}) {
    super(options);
    // TODO: Implement character creation logic
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'swade-character-creator',
      title: 'Create SWADE Character',
      template: 'modules/swade-fantasy-world-kit/templates/character-creation/character-creator.hbs',
      width: 800,
      height: 600,
      resizable: true,
    });
  }

  getData(options = {}) {
    // TODO: Load compendium data, calculate stats
    return {};
  }

  activateListeners(html) {
    super.activateListeners(html);
    // TODO: Bind UI events
  }

  async _updateObject(event, formData) {
    // TODO: Persist character data or export actor
  }
}
