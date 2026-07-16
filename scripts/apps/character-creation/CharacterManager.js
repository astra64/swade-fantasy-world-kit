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
} from './lib/calculator.js';
import { TabManager } from './components/TabManager.js';
import { ConceptTabHandler } from './handlers/ConceptTabHandler.js';
import { AncestryTabHandler } from './handlers/AncestryTabHandler.js';
import { HindrancesTabHandler } from './handlers/HindrancesTabHandler.js';
import { TAB_GUIDANCE, DEFAULT_ATTRIBUTES, SKILL_ATTRIBUTE_MAP, BUDGETS } from './constants.js';

export class CharacterManager extends FormApplication {
  static TAB_HANDLERS = {
    concept: ConceptTabHandler,
    ancestry: AncestryTabHandler,
    hindrances: HindrancesTabHandler,
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

    const result = await super.render(force, options);

    // Restore scroll position after render
    if (scrollPos > 0) {
      this.element?.find('.form-tabs')?.scrollTop(scrollPos);
    }

    // If there's a pending scroll target, scroll to it; otherwise restore tab scroll
    if (this.pendingScrollTarget) {
      setTimeout(() => {
        const target = this.element?.find(this.pendingScrollTarget)?.[0];
        if (target) {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        this.pendingScrollTarget = null;
      }, 0);
    } else if (tabScrollPos > 0) {
      this.element?.find('.tab.active')?.scrollTop(tabScrollPos);
    }

    return result;
  }

  async getData(options = {}) {
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
          attributes: this.actor.system?.attributes || DEFAULT_ATTRIBUTES,
          skills: this.actor.system?.skills || {},
          edges: this.actor.system?.edges || {},
          hindrances: this.actor.system?.hindrances || {},
        };
      } else {
        this.character = initializeCharacter();
      }
      this._initializeFreeCoreSkills();
    }

    // Fetch compendium data if not cached
    if (this.compendiumData.ancestries.length === 0) {
      try {
        this.compendiumData.ancestries = await getAncestries();
        this.compendiumData.skills = await getSkills();
        this.compendiumData.edges = await getEdges();
        this.compendiumData.hindrances = await getHindrances();
        this._buildSkillsByAttribute();
      } catch (error) {
        console.error('[Character Manager] Failed to load compendium data:', error);
        ui.notifications.error('[Character Manager] Could not load Fantasy compendiums. Are they installed and visible?');
      }
    }

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

    return {
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
    };
  }

  activateListeners(html) {
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
  }

  _setupTabHandlers(html) {
    Object.entries(this.tabHandlers).forEach(([tabName, handler]) => {
      if (handler && handler.setup) {
        const tabElement = html.find(`[data-tab="${tabName}"]`);
        if (tabElement.length) {
          handler.setup(tabElement);
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

  _inferAttributeForSkill(skillName) {
    const normalizedName = skillName.toLowerCase().replace(/\s+/g, '-');
    return SKILL_ATTRIBUTE_MAP[normalizedName] || 'smarts';
  }

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

window.CharacterManager = CharacterManager;
