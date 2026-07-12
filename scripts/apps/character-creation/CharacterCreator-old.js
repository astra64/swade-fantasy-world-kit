/**
 * Character Creator - FormApplication for SWADE character generation
 *
 * Features:
 * - Ancestry/skill/edge/hindrance selection from curated compendiums
 * - Inline attribute/skill calculation
 * - Live derived stats preview (Parry, Toughness, Pace)
 * - Export character as actor or JSON
 */

import { getAncestries, getSkills, getEdges, getHindrances, getItemPreview } from './lib/compendium-utils.js';
import { initializeCharacter, calculateDerivedStats } from './lib/calculator.js';

export class CharacterCreator extends FormApplication {
  constructor(options = {}) {
    super(options);
    this.character = null;
    this.compendiumData = {
      ancestries: [],
      skills: [],
      edges: [],
      hindrances: [],
    };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'swade-character-creator',
      title: 'Create SWADE Character',
      template: 'modules/swade-fantasy-world-kit/templates/character-creation/character-creator.hbs',
      width: 900,
      height: 700,
      resizable: true,
      closeOnSubmit: false, // Allow user to continue editing or export after creation
    });
  }

  async getData(options = {}) {
    // Initialize character on first open
    if (!this.character) {
      this.character = initializeCharacter();
    }

    // Fetch compendium data if not cached
    if (this.compendiumData.ancestries.length === 0) {
      try {
        this.compendiumData.ancestries = await getAncestries();
        this.compendiumData.skills = await getSkills();
        this.compendiumData.edges = await getEdges();
        this.compendiumData.hindrances = await getHindrances();
      } catch (error) {
        console.error('[Character Creator] Failed to load compendium data:', error);
        ui.notifications.error('[Character Creation] Could not load Fantasy compendiums. Are they installed and visible?');
      }
    }

    // Calculate current derived stats
    const derivedStats = calculateDerivedStats(this.character);

    return {
      character: this.character,
      ancestries: this.compendiumData.ancestries,
      skills: this.compendiumData.skills,
      edges: this.compendiumData.edges,
      hindrances: this.compendiumData.hindrances,
      derivedStats: derivedStats,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Tab switching
    this._setupTabs(html);

    // Character name input
    html.find('input[name="characterName"]').on('change', (event) => {
      this.character.name = event.target.value;
    });

    // Ancestry selector
    html.find('select[name="ancestry"]').on('change', async (event) => {
      this.character.ancestry = event.target.value;
      this.render();
    });

    // Skill selection (multi-select) - store as array with name and uuid
    html.find('select[name="skills"]').on('change', async (event) => {
      const selectedUuids = Array.from(event.target.selectedOptions).map(opt => opt.value);
      
      // Build skills array with name + uuid
      this.character.skills = {};
      for (const skillUuid of selectedUuids) {
        const skillOption = this.compendiumData.skills.find(s => s.uuid === skillUuid);
        if (skillOption) {
          this.character.skills[skillUuid] = { name: skillOption.name, die: 'd4', advances: 0 };
        }
      }
      
      // Update display without re-rendering (to keep tab active)
      this._updateSkillsDisplay(html);
    });

    // Edges multi-select - store with names
    html.find('select[name="edges"]').on('change', async (event) => {
      const selectedUuids = Array.from(event.target.selectedOptions).map(opt => opt.value);
      
      // Build edges array with name + uuid
      this.character.edges = {};
      for (const edgeUuid of selectedUuids) {
        const edgeOption = this.compendiumData.edges.find(e => e.uuid === edgeUuid);
        if (edgeOption) {
          this.character.edges[edgeUuid] = { name: edgeOption.name };
        }
      }
      
      // Update display without re-rendering
      this._updateEdgesDisplay(html);
    });

    // Hindrances multi-select - store with names
    html.find('select[name="hindrances"]').on('change', async (event) => {
      const selectedUuids = Array.from(event.target.selectedOptions).map(opt => opt.value);
      
      // Build hindrances array with name + uuid
      this.character.hindrances = {};
      for (const hindranceUuid of selectedUuids) {
        const hindranceOption = this.compendiumData.hindrances.find(h => h.uuid === hindranceUuid);
        if (hindranceOption) {
          this.character.hindrances[hindranceUuid] = { name: hindranceOption.name };
        }
      }
      
      // Update display without re-rendering
      this._updateHindrancesDisplay(html);
    });

    // Export as JSON button
    html.find('button[data-action="export-json"]').on('click', () => {
      this._exportAsJson();
    });

    // Create as actor button
    html.find('button[data-action="create-actor"]').on('click', async () => {
      await this._createActor();
    });
  }

  /**
   * Update skills display without full re-render
   */
  _updateSkillsDisplay(html) {
    const skillsList = html.find('.tab[data-tab="skills"] .selected-items ul');
    if (skillsList.length === 0) {
      // Container doesn't exist, create it
      const container = html.find('.tab[data-tab="skills"] .form-group').after(
        `<div class="selected-items"><h4>Selected Skills</h4><ul></ul></div>`
      );
      const ul = html.find('.tab[data-tab="skills"] .selected-items ul');
      this._renderSkillsList(ul);
    } else {
      this._renderSkillsList(skillsList);
    }
  }

  /**
   * Render skills list items
   */
  _renderSkillsList(ul) {
    ul.empty();
    Object.values(this.character.skills).forEach(skill => {
      ul.append(`<li>${skill.name} (${skill.die})</li>`);
    });
  }

  /**
   * Update edges display without full re-render
   */
  _updateEdgesDisplay(html) {
    const edgesList = html.find('.tab[data-tab="edges"] .selected-items ul');
    if (edgesList.length === 0) {
      html.find('.tab[data-tab="edges"] .form-group').after(
        `<div class="selected-items"><h4>Selected Edges</h4><ul></ul></div>`
      );
      const ul = html.find('.tab[data-tab="edges"] .selected-items ul');
      this._renderEdgesList(ul);
    } else {
      this._renderEdgesList(edgesList);
    }
  }

  /**
   * Render edges list items
   */
  _renderEdgesList(ul) {
    ul.empty();
    Object.values(this.character.edges).forEach(edge => {
      ul.append(`<li>${edge.name}</li>`);
    });
  }

  /**
   * Update hindrances display without full re-render
   */
  _updateHindrancesDisplay(html) {
    const hindrancesList = html.find('.tab[data-tab="hindrances"] .selected-items ul');
    if (hindrancesList.length === 0) {
      html.find('.tab[data-tab="hindrances"] .form-group').after(
        `<div class="selected-items"><h4>Selected Hindrances</h4><ul></ul></div>`
      );
      const ul = html.find('.tab[data-tab="hindrances"] .selected-items ul');
      this._renderHindrancesList(ul);
    } else {
      this._renderHindrancesList(hindrancesList);
    }
  }

  /**
   * Render hindrances list items
   */
  _renderHindrancesList(ul) {
    ul.empty();
    Object.values(this.character.hindrances).forEach(hindrance => {
      ul.append(`<li>${hindrance.name}</li>`);
    });
  }

  /**
   * Initialize tabbed interface.
   */
  _setupTabs(html) {
    // Create tab navigation if not present
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
        
        if (tabName === 'basics') button.classList.add('active');
        
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this._switchTab(html, tabName);
        });
        
        tabNav.appendChild(button);
      });

      html.find('.form-tabs').prepend(tabNav);
    }

    // Set up click handlers for existing buttons
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

  async _updateObject(event, formData) {
    // No-op on standard form submission; use custom action buttons instead
    // This prevents accidental data loss on form interaction
    return;
  }

  /**
   * Export character as JSON file for backup/sharing.
   */
  _exportAsJson() {
    try {
      const json = JSON.stringify(this.character, null, 2);
      const filename = `${this.character.name || 'character'}.json`;
      
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      
      ui.notifications.info(`[Character Creation] Exported ${filename}`);
    } catch (error) {
      console.error('[Character Creator] Failed to export JSON:', error);
      ui.notifications.error('[Character Creation] Failed to export character as JSON');
    }
  }

  /**
   * Create character as a new actor in the world.
   * Placeholder for v0.6.2; full implementation deferred.
   */
  async _createActor() {
    try {
      if (!this.character.name) {
        ui.notifications.warn('[Character Creation] Please enter a character name');
        return;
      }

      // Create actor data structure
      const actorData = {
        name: this.character.name,
        type: 'character', // SWADE system default
        data: {
          attributes: this.character.attributes,
          skills: this.character.skills,
          edges: this.character.edges,
          hindrances: this.character.hindrances,
          ancestry: this.character.ancestry,
        },
      };

      // Create actor in world
      const actor = await Actor.create(actorData);
      
      if (actor) {
        ui.notifications.info(`[Character Creation] Created actor: ${actor.name}`);
        this.character = initializeCharacter(); // Reset for next character
        this.render();
      }
    } catch (error) {
      console.error('[Character Creator] Failed to create actor:', error);
      ui.notifications.error('[Character Creation] Failed to create character actor');
    }
  }
}
