/**
 * Traits Tab Handler
 * Manages attributes and skills die selection
 */
import { calculateTotalAttributePoints, calculateTotalSkillPoints } from '../lib/calculator.js';

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

      // Handle skill die dropdown changes
      html.find('select[data-action="set-skill"]').on('change', (e) => {
        const skillUuid = $(e.currentTarget).attr('data-skill-uuid');
        const die = $(e.currentTarget).val();
        this._setSkill(skillUuid, die);
      });

      // Handle add skill button
      html.find('button[data-action="add-skill"]').on('click', (e) => {
        e.preventDefault();
        const skillUuid = $(e.currentTarget).attr('data-skill-uuid');
        this._addSkill(skillUuid);
      });

      // Handle skill removal
      html.find('button[data-action="remove-skill"]').on('click', (e) => {
        e.preventDefault();
        const skillUuid = $(e.currentTarget).attr('data-skill-uuid');
        this._removeSkill(skillUuid);
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

    // Update attribute die value (no budget restriction - warning shown on tab)
    this.characterManager.character.attributes[attribute].die = die;
    this.characterManager.render();
  }

  _setSkill(skillUuid, die) {
    if (!this.characterManager.character.skills) {
      this.characterManager.character.skills = {};
    }

    // If die is empty string, treat as removing the skill selection
    if (!die) {
      if (this.characterManager.character.skills[skillUuid]) {
        delete this.characterManager.character.skills[skillUuid];
      }
      this.characterManager.render();
      return;
    }

    if (!this.characterManager.character.skills[skillUuid]) {
      this.characterManager.character.skills[skillUuid] = { die: 'd4', advances: 0 };
    }

    // Update skill die value (no budget restriction - warning shown on tab)
    this.characterManager.character.skills[skillUuid].die = die;
    this.characterManager.render();
  }

  _addSkill(skillUuid) {
    if (!this.characterManager.character.skills) {
      this.characterManager.character.skills = {};
    }

    // Add skill at d4 if not already present (no budget restriction)
    if (!this.characterManager.character.skills[skillUuid]) {
      this.characterManager.character.skills[skillUuid] = { die: 'd4', advances: 0 };
    }

    this.characterManager.render();
  }

  _removeSkill(skillUuid) {
    if (this.characterManager.character.skills?.[skillUuid]) {
      delete this.characterManager.character.skills[skillUuid];
      this.characterManager.render();
    }
  }
}
