/**
 * Traits Tab Handler
 * Manages attributes and skills die selection
 */
export class TraitsTabHandler {
  constructor(characterManager) {
    this.characterManager = characterManager;
  }

  /**
   * Setup traits tab UI and handlers
   */
  setup(html) {
    try {
      // Handle attribute die button clicks
      html.find('button[data-action="set-attribute"]').on('click', (e) => {
        e.preventDefault();
        const attribute = $(e.currentTarget).attr('data-attribute');
        const die = $(e.currentTarget).attr('data-die');
        this._setAttribute(attribute, die);
      });

      // Handle skill die button clicks
      html.find('button[data-action="set-skill"]').on('click', (e) => {
        e.preventDefault();
        const skillUuid = $(e.currentTarget).attr('data-skill-uuid');
        const die = $(e.currentTarget).attr('data-die');
        this._setSkill(skillUuid, die);
      });
    } catch (error) {
      console.error('[TraitsTabHandler] setup() failed:', error);
    }
  }

  _setAttribute(attribute, die) {
    if (!this.characterManager.character.attributes) {
      this.characterManager.character.attributes = {};
    }

    if (!this.characterManager.character.attributes[attribute]) {
      this.characterManager.character.attributes[attribute] = { die: 'd4', advances: 0 };
    }

    this.characterManager.character.attributes[attribute].die = die;
    this.characterManager.render();
  }

  _setSkill(skillUuid, die) {
    if (!this.characterManager.character.skills) {
      this.characterManager.character.skills = {};
    }

    if (!this.characterManager.character.skills[skillUuid]) {
      this.characterManager.character.skills[skillUuid] = { die: 'd4', advances: 0 };
    }

    this.characterManager.character.skills[skillUuid].die = die;
    this.characterManager.render();
  }
}
