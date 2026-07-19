/**
 * Character Manager - FormApplication for SWADE character creation and advancement
 *
 * Refactored with Tab Handlers and Reusable Components
 * - Tab Handlers: ConceptTabHandler, AncestryTabHandler, etc.
 * - Reusable Components: SearchableDropdown, DragDropManager, TabManager
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
  calculateTotalAttributePoints,
  calculateTotalSkillPoints,
  calculateTotalHindrancePoints,
  getRemainingHindrancePoints,
  getAvailablePerkPoints,
  generatePerkSlots,
  isFreeCoreSkill,
  FREE_CORE_SKILLS,
  getAncestryAttributeBonuses,
} from './lib/calculator.js';
import { TabManager } from './components/TabManager.js';
import { ConceptTabHandler } from './handlers/ConceptTabHandler.js';
import { AncestryTabHandler } from './handlers/AncestryTabHandler.js';
import { HindrancesTabHandler } from './handlers/HindrancesTabHandler.js';
import { TraitsTabHandler } from './handlers/TraitsTabHandler.js';
import { TAB_GUIDANCE, DEFAULT_ATTRIBUTES, BUDGETS } from './constants.js';

export class CharacterManager extends FormApplication {
  static TAB_HANDLERS = {
    concept: ConceptTabHandler,
    ancestry: AncestryTabHandler,
    hindrances: HindrancesTabHandler,
    traits: TraitsTabHandler,
  };

  constructor(options = {}) {
    const formOptions = {
      ...options,
      object: options.actor || {}
    };
    super(formOptions);
    this.actor = options.actor || null;
    this.character = null;
    this.currentTab = 'concept';
    this.compendiumData = {
      ancestries: [],
      skills: [],
      edges: [],
      hindrances: [],
    };
    this.skillsByAttribute = {};

    // Initialize tab handlers from registry
    this.tabHandlers = Object.entries(CharacterManager.TAB_HANDLERS).reduce(
      (handlers, [tabName, HandlerClass]) => {
        handlers[tabName] = new HandlerClass(this);
        return handlers;
      },
      {}
    );

    // Initialize tab manager
    this.tabManager = new TabManager({ currentTab: this.currentTab });
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'swade-character-manager',
      title: 'SWADE Character Manager',
      template: 'modules/swade-fantasy-world-kit/templates/character-creation/character-manager.hbs',
      width: 600,
      height: 500,
      left: 100,
      top: 100,
      resizable: true,
      closeOnSubmit: false,
    });
  }

  get title() {
    if (this.actor) {
      return `Character Manager — ${this.actor.name}`;
    }
    return 'Character Manager';
  }

  async render(force = false, options = {}) {
    // Preserve scroll position
    const scrollPos = this.element?.find('.form-tabs')?.scrollTop() || 0;
    const tabScrollPos = this.element?.find('.tab.active')?.scrollTop() || 0;

    try {
      const result = await super.render(force, options);

      // Use setTimeout to ensure scroll happens after DOM paint
      setTimeout(() => {
        // Restore tab scroll position
        if (tabScrollPos > 0) {
          this.element?.find('.tab.active')?.scrollTop(tabScrollPos);
        }

        // If there's a pending scroll target, scroll to it
        if (this.pendingScrollTarget) {
          const target = this.element?.find(this.pendingScrollTarget)?.[0];
          if (target) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
          this.pendingScrollTarget = null;
        }
      }, 0);

      return result;
    } catch (error) {
      console.error('[CharacterManager] render() failed:', error);
      throw error;
    }
  }

  async getData(options = {}) {
    try {
      // Initialize character on first open
      if (!this.character) {
        if (this.actor) {
          const ancestryItem = this.actor.items.find(item => item.type === 'ancestry');
          let ancestryUuid = ancestryItem?.getFlag('swade-fantasy-world-kit', 'compendiumUuid') || null;

          if (ancestryItem && !ancestryUuid) {
            try {
              const ancestries = await getAncestries();
              const matchedAncestry = ancestries.find(a => a.name === ancestryItem.name);
              if (matchedAncestry) {
                ancestryUuid = matchedAncestry.uuid;
              }
            } catch (e) {
              console.warn('[Character Manager] Could not find matching ancestry in compendium');
            }
          }

          this.character = {
            name: this.actor.name,
            description: this.actor.system?.description || '',
            archetype: this.actor.system?.details?.archetype || '',
            concept: this.actor.system?.details?.notes || '',
            ancestry: ancestryUuid,
            expandedAncestry: false,
            expandedChildItems: {},
            attributes: { ...DEFAULT_ATTRIBUTES, ...(this.actor.system?.attributes || {}) },
            skills: this.actor.system?.skills || {},
            edges: this.actor.system?.edges || {},
            hindrances: this.actor.system?.hindrances || {},
          };
        } else {
          this.character = initializeCharacter();
        }

        // Convert actor attribute format (die.sides) to our format (die: "d4")
        const sidesToDie = { 4: 'd4', 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12' };
        if (this.character.attributes) {
          for (const [attr, data] of Object.entries(this.character.attributes)) {
            if (data.die && typeof data.die === 'object' && data.die.sides) {
              data.die = sidesToDie[data.die.sides] || 'd4';
            } else if (typeof data.die !== 'string') {
              data.die = 'd4';
            }
          }
        }

        // Ensure all attributes have die values
        if (!this.character.attributes) {
          this.character.attributes = { ...DEFAULT_ATTRIBUTES };
        } else {
          for (const attr of Object.keys(DEFAULT_ATTRIBUTES)) {
            if (!this.character.attributes[attr]) {
              this.character.attributes[attr] = DEFAULT_ATTRIBUTES[attr];
            }
          }
        }

        this._initializeFreeCoreSkills();
      }

      // Fetch compendium data if not cached
      if (this.compendiumData.ancestries.length === 0) {
        console.log('[CharacterManager] Loading compendium data...');
        try {
          this.compendiumData.ancestries = await getAncestries();
          this.compendiumData.skills = await getSkills();
          this.compendiumData.edges = await getEdges();
          this.compendiumData.hindrances = await getHindrances();
          console.log('[CharacterManager] Compendium loaded. Skills count:', this.compendiumData.skills.length);
        } catch (error) {
          console.error('[Character Manager] Failed to load compendium data:', error);
          ui.notifications.error('[Character Manager] Could not load Fantasy compendiums. Are they installed and visible?');
        }
      } else {
        console.log('[CharacterManager] Using cached compendium data. Skills count:', this.compendiumData.skills.length);
      }

      // Always rebuild skills by attribute (needed for renders after character changes)
      this._buildSkillsByAttribute();

      // Fetch ancestry preview if selected
      let selectedAncestryData = null;
      let childItemsData = [];
      if (this.character.ancestry) {
        selectedAncestryData = await getItemPreview(this.character.ancestry);

        // Fetch full data for granted items
        if (selectedAncestryData?.system?.grants && Array.isArray(selectedAncestryData.system.grants)) {
          for (const grant of selectedAncestryData.system.grants) {
            try {
              const itemData = await getItemPreview(grant.uuid);
              if (itemData) {
                // Enrich the description to handle embedded items/links
                if (itemData.system?.description) {
                  itemData.system.description = await TextEditor.enrichHTML(itemData.system.description, { async: true });
                }
                // Add expanded state to each child item
                itemData.isExpanded = this.character.expandedChildItems[itemData.uuid] || false;
                childItemsData.push(itemData);
              }
            } catch (e) {
              console.warn('[Character Manager] Failed to load granted item:', grant.uuid);
            }
          }
        }

        // Enrich ancestry description as well
        if (selectedAncestryData?.system?.description) {
          selectedAncestryData.system.description = await TextEditor.enrichHTML(selectedAncestryData.system.description, { async: true });
        }
      }

      const derivedStats = calculateDerivedStats(this.character);
      const attributePointsUsed = calculateTotalAttributePoints(this.character);
      const skillPointsUsed = calculateTotalSkillPoints(this.character, this._getSkillCompendiumMap());
      const availablePerkPoints = getAvailablePerkPoints(this.character);
      const perkSlots = generatePerkSlots(this.character);
      const ancestryBonuses = selectedAncestryData ? getAncestryAttributeBonuses(selectedAncestryData, childItemsData) : {};

      // Calculate perk points spent based on actual option costs
      const perkOptionCosts = {
        'attribute-boost': 2,
        'edge': 2,
        'skill-point': 1,
        'extra-funds': 1,
      };
      const perkPointsSpent = perkSlots.reduce((sum, slot) => {
        if (!slot.selected) return sum;
        const cost = perkOptionCosts[slot.selected] || 0;
        return sum + cost;
      }, 0);

      // Get currency settings from SWADE system
      const currencyName = game.settings.get('swade', 'currencyName') || 'Silver';
      const pcStartingCurrency = game.settings.get('swade', 'pcStartingCurrency') || 600;
      const currencyAmount = pcStartingCurrency * 2;

      const data = {
        character: this.character,
        selectedAncestryData: selectedAncestryData,
        childItemsData: childItemsData,
        ancestries: this.compendiumData.ancestries,
        skills: this.compendiumData.skills,
        edges: this.compendiumData.edges,
        hindrances: this.compendiumData.hindrances,
        skillsByAttribute: this.skillsByAttribute,
        derivedStats: derivedStats,
        attributePointsUsed: attributePointsUsed,
        attributePointsRemaining: 5 - attributePointsUsed,
        skillPointsUsed: skillPointsUsed,
        skillPointsRemaining: 12 - skillPointsUsed,
        availablePerkPoints: availablePerkPoints,
        perkPointsSpent: perkPointsSpent,
        edgePointsMax: 0,
        currentTab: this.currentTab,
        expandedAncestry: this.character.expandedAncestry,
        expandedChildItems: this.character.expandedChildItems || {},
        perkSlots: perkSlots,
        tabGuidance: this._getTabGuidance(),
        currencyName: currencyName,
        currencyAmount: currencyAmount,
        attributes: DEFAULT_ATTRIBUTES,
        FREE_CORE_SKILLS: FREE_CORE_SKILLS,
        ancestryBonuses: ancestryBonuses,
        attributeDescriptions: {
          strength: 'Strength is physical power and fitness. It’s also used as the basis of a warrior’s damage in hand-to-hand combat, and to determine the equipment he can use or carry.',
          agility: 'Agility is a measure of a character’s nimbleness, dexterity, and general coordination',
          vigor: 'Vigor represents an individual’s endurance, resistance to disease, poison, or toxins, and how much physical damage she can take before she can’t go on. It is most often used to resist Fatigue effects, and as the basis for the derived stat of Toughness.',
          smarts: 'Smarts measures raw intelligence, mental acuity, and how fast a heroine thinks on her feet. It’s used to resist certain types of mental and social attacks.',
          spirit: 'Spirit is self-confidence, backbone, and willpower. It’s used to resist social and supernatural attacks as well as fear.',
        },
      };

      return data;
    } catch (error) {
      console.error('[CharacterManager] getData() failed:', error);
      throw error;
    }
  }

  activateListeners(html) {
    try {
      super.activateListeners(html);

      // Setup tab navigation
      this.tabManager.setup(html, (tabName) => {
        this.currentTab = tabName;
      });

      // Setup all tab handlers
      this._setupTabHandlers(html);

      // Form actions
      html.find('button[data-action="save"]').on('click', async () => {
        await this._createActor();
      });

      html.find('button[data-action="cancel"]').on('click', () => {
        this.close();
      });
    } catch (error) {
      console.error('[CharacterManager] activateListeners() error:', error);
    }
  }

  _setupTabHandlers(html) {
    Object.entries(this.tabHandlers).forEach(([tabName, handler]) => {
      if (handler && handler.setup) {
        const tabElement = html.find(`[data-tab="${tabName}"]`);
        if (tabElement.length) {
          try {
            handler.setup(tabElement);
          } catch (error) {
            console.error(`[CharacterManager] Error setting up ${tabName} handler:`, error);
          }
        } else {
          console.warn(`[CharacterManager] Tab element not found for: ${tabName}`);
        }
      }
    });
  }

  _getTabGuidance() {
    return TAB_GUIDANCE;
  }

  _initializeFreeCoreSkills() {
    if (!this.character.skills) {
      this.character.skills = {};
    }
  }

  _buildSkillsByAttribute() {
    this.skillsByAttribute = {
      agility: [],
      smarts: [],
      spirit: [],
      strength: [],
      vigor: [],
    };

    for (const skill of this.compendiumData.skills) {
      // Skip Unskilled Attempt (fallback skill, added separately at end)
      if (skill.name.toLowerCase() === 'unskilled attempt') {
        continue;
      }

      const attrLink = skill.attribute || 'smarts';
      if (this.skillsByAttribute[attrLink]) {
        const isCoreSkill = isFreeCoreSkill(skill.name);
        this.skillsByAttribute[attrLink].push({
          uuid: skill.uuid,
          name: skill.name,
          isCoreSkill: isCoreSkill,
          die: this.character.skills[skill.uuid]?.die ?? (isCoreSkill ? 'd4' : null),
          description: skill.description || '',
        });
      }
    }
  }

  _getSkillCompendiumMap() {
    const map = {};
    for (const skill of this.compendiumData.skills) {
      map[skill.uuid] = {
        name: skill.name,
        linkedAttribute: skill.attribute || 'smarts',
      };
    }
    return map;
  }

  async _updateObject(event, formData) {
    // No-op on standard form submission
    return;
  }

  async _createActor() {
    try {
      if (!this.character.name) {
        ui.notifications.warn('[Character Creation] Please enter a character name');
        return;
      }

      // Add Unskilled Attempt skill (fallback for untrained skills)
      const unskilleddSkill = this.compendiumData.skills.find(s => s.name.toLowerCase() === 'unskilled attempt');
      if (unskilleddSkill && !this.character.skills[unskilleddSkill.uuid]) {
        this.character.skills[unskilleddSkill.uuid] = { die: 'd4', advances: 0 };
      }

      if (this.actor) {
        const updateData = {
          name: this.character.name,
          system: {
            details: {
              archetype: this.character.archetype,
              notes: this.character.concept,
            },
            attributes: this.character.attributes,
            skills: this.character.skills,
            edges: this.character.edges,
            hindrances: this.character.hindrances,
          },
        };

        await this.actor.update(updateData);

        if (this.character.ancestry) {
          const existingAncestries = this.actor.items.filter(item => item.type === 'ancestry');
          if (existingAncestries.length > 0) {
            await this.actor.deleteEmbeddedDocuments('Item', existingAncestries.map(i => i.id));
          }

          const ancestryItem = await fromUuid(this.character.ancestry);
          if (ancestryItem) {
            const itemData = ancestryItem.toObject();
            delete itemData._id;
            const created = await this.actor.createEmbeddedDocuments('Item', [itemData]);
            if (created.length > 0) {
              await created[0].setFlag('swade-fantasy-world-kit', 'compendiumUuid', this.character.ancestry);
            }
          }
        } else {
          const existingAncestries = this.actor.items.filter(item => item.type === 'ancestry');
          if (existingAncestries.length > 0) {
            await this.actor.deleteEmbeddedDocuments('Item', existingAncestries.map(i => i.id));
          }
        }

        ui.notifications.info(`[Character Creation] Saved: ${this.actor.name}`);
      } else {
        const actorData = {
          name: this.character.name,
          type: 'character',
          system: {
            details: {
              archetype: this.character.archetype,
              notes: this.character.concept,
            },
            attributes: this.character.attributes,
            skills: this.character.skills,
            edges: this.character.edges,
            hindrances: this.character.hindrances,
          },
        };

        const newActor = await Actor.create(actorData);

        if (this.character.ancestry) {
          const ancestryItem = await fromUuid(this.character.ancestry);
          if (ancestryItem) {
            const itemData = ancestryItem.toObject();
            delete itemData._id;
            const created = await newActor.createEmbeddedDocuments('Item', [itemData]);
            if (created.length > 0) {
              await created[0].setFlag('swade-fantasy-world-kit', 'compendiumUuid', this.character.ancestry);
            }
          }
        }

        ui.notifications.info(`[Character Creation] Created: ${this.character.name}`);
      }

      this.character = initializeCharacter();
      this._initializeFreeCoreSkills();
      this.render();
    } catch (error) {
      console.error('[Character Manager] Failed to save actor:', error);
      ui.notifications.error('[Character Creation] Failed to save character');
    }
  }
}

// Register Handlebars helpers
Handlebars.registerHelper('isPerkSlotVisible', (slots, index) => {
  if (index === 0) return true;  // First slot always visible
  const prevSlot = slots[index - 1];
  if (!prevSlot) return false;
  // If previous slot selected a 2-point perk, this slot is hidden
  return !(['attribute-boost', 'edge'].includes(prevSlot.selected));
});

Handlebars.registerHelper('objLength', (obj) => {
  if (typeof obj !== 'object' || obj === null) return 0;
  return Object.keys(obj).length;
});

Handlebars.registerHelper('gte', (a, b) => a >= b);

Handlebars.registerHelper('capitalize', (str) => {
  if (typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
});

window.CharacterManager = CharacterManager;
