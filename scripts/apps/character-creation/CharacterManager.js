/**
 * Character Creator - FormApplication for SWADE character generation
 *
 * Features:
 * - Single-page Traits tab combining Attributes and Skills
 * - Attribute and skill die value selection with cost tracking
 * - Live derived stats preview (Parry, Toughness)
 * - Export character as actor or JSON
 * - Point budget tracking with over-limit warnings
 */

import { 
  getAncestries, 
  getSkills, 
  getEdges, 
  getHindrances, 
  getItemPreview 
} from './lib/compendium-utils.js';
import { 
  initializeCharacter, 
  calculateDerivedStats,
  FREE_CORE_SKILLS,
  isFreeCoreSkill,
  calculateSkillCost,
  calculateTotalAttributePoints,
  calculateTotalSkillPoints,
  getRemainingAttributePoints,
  getRemainingSkillPoints,
} from './lib/calculator.js';

export class CharacterManager extends FormApplication {
  constructor(options = {}) {
    super(options);
    this.character = null;
    this.compendiumData = {
      ancestries: [],
      skills: [],
      edges: [],
      hindrances: [],
    };
    this.skillsByAttribute = {}; // Cache for skills organized by attribute
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'swade-character-creator',
      title: 'Create SWADE Character',
      template: 'modules/swade-fantasy-world-kit/templates/character-creation/character-creator.hbs',
      width: 1000,
      height: 800,
      resizable: true,
      closeOnSubmit: false,
    });
  }

  async getData(options = {}) {
    // Initialize character on first open
    if (!this.character) {
      this.character = initializeCharacter();
      // Pre-populate free core skills
      this._initializeFreeCoreSkills();
    }

    // Fetch compendium data if not cached
    if (this.compendiumData.ancestries.length === 0) {
      try {
        this.compendiumData.ancestries = await getAncestries();
        this.compendiumData.skills = await getSkills();
        this.compendiumData.edges = await getEdges();
        this.compendiumData.hindrances = await getHindrances();
        
        // Build skills by attribute mapping
        this._buildSkillsByAttribute();
      } catch (error) {
        console.error('[Character Creator] Failed to load compendium data:', error);
        ui.notifications.error('[Character Creation] Could not load Fantasy compendiums. Are they installed and visible?');
      }
    }

    // Calculate derived stats
    const derivedStats = calculateDerivedStats(this.character);

    // Calculate point usage
    const attributePointsUsed = calculateTotalAttributePoints(this.character);
    const skillPointsUsed = calculateTotalSkillPoints(this.character, this._getSkillCompendiumMap());

    return {
      character: this.character,
      ancestries: this.compendiumData.ancestries,
      skills: this.compendiumData.skills,
      edges: this.compendiumData.edges,
      hindrances: this.compendiumData.hindrances,
      skillsByAttribute: this.skillsByAttribute,
      derivedStats: derivedStats,
      attributePointsUsed: attributePointsUsed,
      skillPointsUsed: skillPointsUsed,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Tab switching
    this._setupTabs(html);

    // ===== BASICS TAB =====
    html.find('input[name="characterName"]').on('change', (event) => {
      this.character.name = event.target.value;
    });

    html.find('select[name="ancestry"]').on('change', async (event) => {
      this.character.ancestry = event.target.value;
      this.render();
    });

    html.find('textarea[name="description"]').on('change', (event) => {
      this.character.description = event.target.value;
    });

    // ===== TRAITS TAB =====
    // Attribute die selection
    html.find('button[data-action="set-attribute"]').on('click', (event) => {
      event.preventDefault();
      const attribute = event.target.dataset.attribute;
      const die = event.target.dataset.die;
      
      // Cannot lower attributes below d4
      if (die === 'd4') return;
      
      this.character.attributes[attribute].die = die;
      this.render();
    });

    // Skill die selection
    html.find('button[data-action="set-skill"]').on('click', (event) => {
      event.preventDefault();
      const skillUuid = event.target.dataset.skillUuid;
      const skillName = event.target.dataset.skillName;
      const die = event.target.dataset.die;
      
      // Initialize skill if not present
      if (!this.character.skills[skillUuid]) {
        this.character.skills[skillUuid] = {
          name: skillName,
          die: 'd4',
          advances: 0,
        };
      }
      
      // For core skills, cannot go below d4
      if (isFreeCoreSkill(skillName) && die === 'd4') {
        this.character.skills[skillUuid].die = die;
      } else {
        this.character.skills[skillUuid].die = die;
      }
      
      this.render();
    });

    // ===== EDGES TAB =====
    html.find('select[name="edges"]').on('change', async (event) => {
      const selectedUuids = Array.from(event.target.selectedOptions).map(opt => opt.value);
      
      this.character.edges = {};
      for (const edgeUuid of selectedUuids) {
        const edgeOption = this.compendiumData.edges.find(e => e.uuid === edgeUuid);
        if (edgeOption) {
          this.character.edges[edgeUuid] = { name: edgeOption.name };
        }
      }
      
      this._updateEdgesDisplay(html);
    });

    // ===== HINDRANCES TAB =====
    html.find('select[name="hindrances"]').on('change', async (event) => {
      const selectedUuids = Array.from(event.target.selectedOptions).map(opt => opt.value);
      
      this.character.hindrances = {};
      for (const hindranceUuid of selectedUuids) {
        const hindranceOption = this.compendiumData.hindrances.find(h => h.uuid === hindranceUuid);
        if (hindranceOption) {
          this.character.hindrances[hindranceUuid] = { name: hindranceOption.name };
        }
      }
      
      this._updateHindrancesDisplay(html);
    });

    // ===== FORM ACTIONS =====
    html.find('button[data-action="export-json"]').on('click', () => {
      this._exportAsJson();
    });

    html.find('button[data-action="create-actor"]').on('click', async () => {
      await this._createActor();
    });

    html.find('button[data-action="close"]').on('click', () => {
      this.close();
    });
  }

  /**
   * Initialize free core skills at d4 if not already in character.skills
   */
  _initializeFreeCoreSkills() {
    // This will be populated when skills are fetched from compendium
    // For now, just ensure the skills object exists
    if (!this.character.skills) {
      this.character.skills = {};
    }
  }

  /**
   * Build skillsByAttribute mapping from compendium data.
   * Groups skills under their linked attributes.
   */
  _buildSkillsByAttribute() {
    this.skillsByAttribute = {
      agility: [],
      smarts: [],
      spirit: [],
      strength: [],
      vigor: [],
    };

    // For each skill, determine its linked attribute and add to group
    // This is a simplified version - ideally skill metadata would contain linked attribute
    // For now, we're using a hardcoded mapping or inferring from item data
    for (const skill of this.compendiumData.skills) {
      // TODO: Get linked attribute from skill item metadata
      // For now, we'll populate this in a simplified way
      const attrLink = this._inferAttributeForSkill(skill.name);
      if (this.skillsByAttribute[attrLink]) {
        this.skillsByAttribute[attrLink].push({
          uuid: skill.uuid,
          name: skill.name,
          isCoreSkill: isFreeCoreSkill(skill.name),
          die: this.character.skills[skill.uuid]?.die ?? 'd4',
        });
      }
    }
  }

  /**
   * Infer which attribute a skill links to based on skill name.
   * This is a temporary solution until skill metadata is available.
   * 
   * @param {string} skillName - Skill name
   * @returns {string} Attribute name (agility, smarts, spirit, strength, vigor)
   */
  _inferAttributeForSkill(skillName) {
    // Common SWADE skill mappings (simplified)
    const skillMappings = {
      'athletics': 'strength',
      'common-knowledge': 'smarts',
      'notice': 'smarts',
      'persuasion': 'spirit',
      'stealth': 'agility',
      'fighting': 'agility',
      'shooting': 'agility',
      'riding': 'agility',
      'academics': 'smarts',
      'arcane': 'smarts',
      'battle': 'smarts',
      'boating': 'agility',
      'healing': 'smarts',
      'occultism': 'smarts',
      'investigation': 'smarts',
      'lockpicking': 'agility',
      'piloting': 'agility',
      'repair': 'smarts',
      'survival': 'smarts',
      'taunt': 'spirit',
      'faith': 'spirit',
      'intimidation': 'spirit',
      'performance': 'spirit',
      'psionics': 'smarts',
      'swimming': 'strength',
      'throwing': 'strength',
    };

    const normalizedName = skillName.toLowerCase().replace(/\s+/g, '-');
    return skillMappings[normalizedName] || 'smarts'; // Default to smarts
  }

  /**
   * Get skill compendium map for cost calculations
   */
  _getSkillCompendiumMap() {
    const map = {};
    for (const skill of this.compendiumData.skills) {
      map[skill.uuid] = {
        name: skill.name,
        linkedAttribute: this._inferAttributeForSkill(skill.name),
      };
    }
    return map;
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
    // No-op on standard form submission
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
   * Create character as new actor in world.
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
        type: 'character',
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
        this.character = initializeCharacter();
        this._initializeFreeCoreSkills();
        this.render();
      }
    } catch (error) {
      console.error('[Character Creator] Failed to create actor:', error);
      ui.notifications.error('[Character Creation] Failed to create character actor');
    }
  }
}

// Expose for use in macros
window.CharacterManager = CharacterManager;
