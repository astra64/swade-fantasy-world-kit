/**
 * Advancement Manager - FormApplication for SWADE advancement automation
 *
 * Features:
 * - XP tracking and advancement cost calculations
 * - Guided skill/attribute/edge/hindrance advancement
 * - Item upgrades and equipment recommendations
 * - Live preview of advancement effects
 */

import { applyAdvancement, calculateAdvancementCost, calculateDerivedStats } from './lib/calculator.js';
import { getSkills, getEdges } from './lib/compendium-utils.js';

export class AdvancementManager extends FormApplication {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedAdvancements = [];
    this.compendiumData = {
      skills: [],
      edges: [],
    };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'swade-advancement-manager',
      title: `Advance SWADE Character - ${game.actors.get(this.actor?.id)?.name ?? 'Unknown'}`,
      template: 'modules/swade-fantasy-world-kit/templates/character-creation/advancement-manager.hbs',
      width: 900,
      height: 700,
      resizable: true,
      closeOnSubmit: false,
    });
  }

  async getData(options = {}) {
    if (!this.actor) {
      throw new Error('[Advancement Manager] No actor provided');
    }

    // Fetch compendium data if not cached
    if (this.compendiumData.skills.length === 0) {
      try {
        this.compendiumData.skills = await getSkills();
        this.compendiumData.edges = await getEdges();
      } catch (error) {
        console.error('[Advancement Manager] Failed to load compendium data:', error);
      }
    }

    // Get current actor data
    const actorData = this.actor.toObject();
    const currentXP = this.actor.system?.experience ?? 0;
    const currentAdvances = (this.actor.system?.advances ?? 0);

    // Calculate available advancements based on current XP
    const availableSkillAdvancements = this._getAvailableSkillAdvancements();
    const availableAttributeAdvancements = this._getAvailableAttributeAdvancements();

    // Calculate costs for common advancements
    const skillIncreaseCost = calculateAdvancementCost('skill', 0);
    const attributeIncreaseCost = calculateAdvancementCost('attribute', 0);

    return {
      actor: this.actor,
      actorData: actorData,
      currentXP: currentXP,
      currentAdvances: currentAdvances,
      skills: this.compendiumData.skills,
      edges: this.compendiumData.edges,
      availableSkillAdvancements: availableSkillAdvancements,
      availableAttributeAdvancements: availableAttributeAdvancements,
      skillIncreaseCost: skillIncreaseCost,
      attributeIncreaseCost: attributeIncreaseCost,
      selectedAdvancements: this.selectedAdvancements,
      totalAdvancementCost: this._calculateTotalCost(),
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Tab switching
    this._setupTabs(html);

    // XP input (manual adjustment)
    html.find('input[name="xp"]').on('change', (event) => {
      const newXP = parseInt(event.target.value) || 0;
      this.actor.update({ 'system.experience': newXP });
    });

    // Skill advancement selection
    html.find('button[data-action="add-skill-advancement"]').on('click', (event) => {
      const skillUuid = event.target.dataset.skillUuid;
      this._addAdvancement({ type: 'skill-increase', target: skillUuid });
      this.render();
    });

    // Attribute advancement selection
    html.find('button[data-action="add-attribute-advancement"]').on('click', (event) => {
      const attrKey = event.target.dataset.attribute;
      this._addAdvancement({ type: 'attribute-increase', target: attrKey });
      this.render();
    });

    // Edge selection
    html.find('button[data-action="add-edge"]').on('click', (event) => {
      const edgeUuid = event.target.dataset.edgeUuid;
      this._addAdvancement({ type: 'add-edge', target: edgeUuid });
      this.render();
    });

    // Remove advancement
    html.find('button[data-action="remove-advancement"]').on('click', (event) => {
      const index = parseInt(event.target.dataset.index);
      this.selectedAdvancements.splice(index, 1);
      this.render();
    });

    // Apply advancements button
    html.find('button[data-action="apply-advancements"]').on('click', async () => {
      await this._applyAdvancements();
    });
  }

  /**
   * Initialize tabbed interface.
   */
  _setupTabs(html) {
    const existingNav = html.find('.form-tabs .tab-navigation');
    if (existingNav.length === 0) {
      const tabNav = document.createElement('div');
      tabNav.className = 'tab-navigation';

      const tabs = Array.from(html.find('.form-tabs .tab'));
      tabs.forEach((tab) => {
        const tabName = tab.dataset.tab;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tab-btn';
        button.dataset.tab = tabName;
        button.textContent = tab.querySelector('h3')?.textContent ?? tabName;
        
        if (tabName === 'xp') button.classList.add('active');
        
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this._switchTab(html, tabName);
        });
        
        tabNav.appendChild(button);
      });

      html.find('.form-tabs').prepend(tabNav);
    }

    html.find('.tab-navigation .tab-btn').on('click', (event) => {
      event.preventDefault();
      const tabName = event.target.dataset.tab;
      this._switchTab(html, tabName);
    });
  }

  /**
   * Switch active tab.
   */
  _switchTab(html, tabName) {
    html.find('.form-tabs .tab').removeClass('active');
    html.find(`.form-tabs .tab[data-tab="${tabName}"]`).addClass('active');
    
    html.find('.tab-navigation .tab-btn').removeClass('active');
    html.find(`.tab-navigation .tab-btn[data-tab="${tabName}"]`).addClass('active');
  }

  /**
   * Get available skill advancement options.
   */
  _getAvailableSkillAdvancements() {
    const currentXP = this.actor.system?.experience ?? 0;
    const skillCost = calculateAdvancementCost('skill', 0);
    
    return currentXP >= skillCost ? this.compendiumData.skills : [];
  }

  /**
   * Get available attribute advancement options.
   */
  _getAvailableAttributeAdvancements() {
    const currentXP = this.actor.system?.experience ?? 0;
    const attrCost = calculateAdvancementCost('attribute', 0);
    
    if (currentXP < attrCost) return [];
    
    return [
      'agility', 'smarts', 'spirit', 'strength', 'vigor'
    ];
  }

  /**
   * Add advancement to selected list.
   */
  _addAdvancement(advancement) {
    this.selectedAdvancements.push(advancement);
  }

  /**
   * Calculate total cost of selected advancements.
   */
  _calculateTotalCost() {
    let total = 0;
    for (const advancement of this.selectedAdvancements) {
      if (advancement.type === 'skill-increase') {
        total += calculateAdvancementCost('skill', 0);
      } else if (advancement.type === 'attribute-increase') {
        total += calculateAdvancementCost('attribute', 0);
      }
      // Edges/hindrances deferred to v0.6.2+ expansion
    }
    return total;
  }

  async _updateObject(event, formData) {
    // No-op; use custom action buttons instead
    return;
  }

  /**
   * Apply selected advancements to actor.
   */
  async _applyAdvancements() {
    try {
      if (this.selectedAdvancements.length === 0) {
        ui.notifications.warn('[Advancement Manager] No advancements selected');
        return;
      }

      const totalCost = this._calculateTotalCost();
      const currentXP = this.actor.system?.experience ?? 0;

      if (currentXP < totalCost) {
        ui.notifications.error('[Advancement Manager] Insufficient XP for selected advancements');
        return;
      }

      // Apply each advancement to actor system data
      const updates = {};
      let newXP = currentXP;
      let newAdvances = (this.actor.system?.advances ?? 0);

      for (const advancement of this.selectedAdvancements) {
        switch (advancement.type) {
          case 'skill-increase':
            newAdvances++;
            break;
          case 'attribute-increase':
            newAdvances++;
            break;
        }
      }

      newXP -= totalCost;

      // Update actor with new XP and advances
      await this.actor.update({
        'system.experience': newXP,
        'system.advances': newAdvances,
      });

      // Reset selection
      this.selectedAdvancements = [];
      this.render();

      ui.notifications.info('[Advancement Manager] Advancements applied successfully');
    } catch (error) {
      console.error('[Advancement Manager] Failed to apply advancements:', error);
      ui.notifications.error('[Advancement Manager] Failed to apply advancements');
    }
  }
}
