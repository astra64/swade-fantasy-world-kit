/**
 * Traits Tab Handler
 * Manages attributes and skills die selection with budget validation
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

    // Check if this change would exceed the 5-point budget
    const currentDie = this.characterManager.character.attributes[attribute].die;
    const oldPoints = this._calculateAttributePoints(currentDie);
    const newPoints = this._calculateAttributePoints(die);

    // Temporarily set to new die to calculate total
    this.characterManager.character.attributes[attribute].die = die;
    const totalAfterChange = calculateTotalAttributePoints(this.characterManager.character);

    // Revert to old die
    this.characterManager.character.attributes[attribute].die = currentDie;

    if (totalAfterChange > 5) {
      ui.notifications.warn(`Setting ${attribute} to ${die} would exceed the 5-point attribute budget`);
      return;
    }

    // Update is valid
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

    // Check if this change would exceed the 12-point budget
    const currentDie = this.characterManager.character.skills[skillUuid].die;

    // Temporarily set to new die to calculate total
    this.characterManager.character.skills[skillUuid].die = die;
    const skillMap = this.characterManager._getSkillCompendiumMap();
    const totalAfterChange = calculateTotalSkillPoints(this.characterManager.character, skillMap);

    // Revert to old die
    this.characterManager.character.skills[skillUuid].die = currentDie;

    if (totalAfterChange > 12) {
      ui.notifications.warn(`Setting this skill to ${die} would exceed the 12-point skill budget`);
      return;
    }

    // Update is valid
    this.characterManager.character.skills[skillUuid].die = die;
    this.characterManager.render();
  }

  _addSkill(skillUuid) {
    if (!this.characterManager.character.skills) {
      this.characterManager.character.skills = {};
    }

    // Add skill at d4 if not already present
    if (!this.characterManager.character.skills[skillUuid]) {
      // Check if adding at d4 would exceed budget
      this.characterManager.character.skills[skillUuid] = { die: 'd4', advances: 0 };
      const skillMap = this.characterManager._getSkillCompendiumMap();
      const totalAfterChange = calculateTotalSkillPoints(this.characterManager.character, skillMap);

      if (totalAfterChange > 12) {
        // Remove the skill if it would exceed budget
        delete this.characterManager.character.skills[skillUuid];
        ui.notifications.warn('Adding this skill would exceed the 12-point skill budget');
        return;
      }
    }

    this.characterManager.render();
  }

  _removeSkill(skillUuid) {
    if (this.characterManager.character.skills?.[skillUuid]) {
      delete this.characterManager.character.skills[skillUuid];
      this.characterManager.render();
    }
  }

  /**
   * Calculate points for a single attribute die value
   * @param {string} die - Die value like 'd4', 'd6', etc.
   * @returns {number} Points spent (steps above d4)
   */
  _calculateAttributePoints(die) {
    const DIE_VALUES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12 };
    const value = DIE_VALUES[die] ?? 4;
    return Math.max(0, value - 4);
  }
}
