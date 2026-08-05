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
  getGearItems,
  getItemPreview
} from './lib/compendium-utils.js';
import {
  initializeCharacter,
  calculateDerivedStats,
  calculateTotalAttributePoints,
  calculateTotalSkillPoints,
  calculateTotalHindrancePoints,
  getRemainingHindrancePoints,
  getSkillPointBreakdown,
  getAvailablePerkPoints,
  generatePerkSlots,
  isFreeCoreSkill,
  FREE_CORE_SKILLS,
  getAncestryAttributeBonuses,
  calculateAvailableEdgePoints,
  calculateUsedEdgePoints,
  calculateBonusAttributePoints,
  calculateBonusSkillPoints,
  calculateAncestryBonusEdgePoints,
  calculateGearCost,
} from './lib/calculator.js';
import { TabManager } from './components/TabManager.js';
import { ConceptTabHandler } from './handlers/ConceptTabHandler.js';
import { AncestryTabHandler } from './handlers/AncestryTabHandler.js';
import { HindrancesTabHandler } from './handlers/HindrancesTabHandler.js';
import { TraitsTabHandler } from './handlers/TraitsTabHandler.js';
import { EdgesTabHandler } from './handlers/EdgesTabHandler.js';
import { GearTabHandler } from './handlers/GearTabHandler.js';
import { TAB_GUIDANCE, DEFAULT_ATTRIBUTES, ATTRIBUTE_DESCRIPTIONS, ATTRIBUTE_TIPS } from './constants.js';

const MODULE_ID = 'swade-fantasy-world-kit';

export class CharacterManager extends FormApplication {
  static TAB_HANDLERS = {
    concept: ConceptTabHandler,
    ancestry: AncestryTabHandler,
    hindrances: HindrancesTabHandler,
    traits: TraitsTabHandler,
    edges: EdgesTabHandler,
    gear: GearTabHandler,
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
      gear: [],
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

      // Use requestAnimationFrame (not setTimeout) so the restore lands before the
      // browser's next paint — setTimeout(0) is a macrotask and lets the reset-to-top
      // frame paint first, causing a visible flicker.
      requestAnimationFrame(() => {
        // Restore outer form scroll position
        if (scrollPos > 0) {
          this.element?.find('.form-tabs')?.scrollTop(scrollPos);
        }

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
      });

      return result;
    } catch (error) {
      console.error('[CharacterManager] render() failed:', error);
      throw error;
    }
  }

  async getData(options = {}) {
    try {
      // Fetch compendium data if not cached (needed before character detection below)
      if (this.compendiumData.ancestries.length === 0) {
        console.log('[CharacterManager] Loading compendium data...');
        try {
          this.compendiumData.ancestries = await getAncestries();
          this.compendiumData.skills = await getSkills();
          this.compendiumData.edges = await getEdges();
          this.compendiumData.hindrances = await getHindrances();
          this.compendiumData.gear = await getGearItems();
          console.log('[CharacterManager] Compendium loaded. Skills count:', this.compendiumData.skills.length);
        } catch (error) {
          console.error('[Character Manager] Failed to load compendium data:', error);
          ui.notifications.error('[Character Manager] Could not load Fantasy compendiums. Are they installed and visible?');
        }
      } else {
        console.log('[CharacterManager] Using cached compendium data. Skills count:', this.compendiumData.skills.length);
      }

      // Initialize character on first open (after compendium data is available, so
      // existing actor Skills/Edges/Hindrances can be matched to compendium entries)
      if (!this.character) {
        if (this.actor) {
          const ancestryItem = this.actor.items.find(item => item.type === 'ancestry');
          let ancestryUuid = ancestryItem?.getFlag('swade-fantasy-world-kit', 'compendiumUuid') || null;

          if (ancestryItem && !ancestryUuid) {
            const matchedAncestry = this.compendiumData.ancestries.find(a => a.name === ancestryItem.name);
            // Fall back to the actor's own embedded item when the ancestry isn't from the
            // configured compendium (e.g. added from elsewhere, or homebrew) — the compendium
            // is only a suggestion source, any ancestry actually on the actor should display.
            ancestryUuid = matchedAncestry ? matchedAncestry.uuid : ancestryItem.uuid;
          }

          this.character = {
            name: this.actor.name,
            description: this.actor.system?.description || '',
            archetype: this.actor.system?.details?.archetype || '',
            concept: this.actor.system?.details?.notes || '',
            ancestry: ancestryUuid,
            expandedAncestry: false,
            expandedChildItems: {},
            expandedGrantedSections: {},
            attributes: { ...DEFAULT_ATTRIBUTES, ...(this.actor.system?.attributes || {}) },
            skills: await this._detectSkillsFromActor(this.actor),
            edges: await this._detectEdgesFromActor(this.actor),
            hindrances: await this._detectHindrancesFromActor(this.actor),
            gear: await this._detectGearFromActor(this.actor),
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

      // Always rebuild skills by attribute (needed for renders after character changes)
      this._buildSkillsByAttribute();

      // Fetch ancestry preview if selected
      let selectedAncestryData = null;
      let childItemsData = [];
      if (this.character.ancestry) {
        selectedAncestryData = await getItemPreview(this.character.ancestry);
        childItemsData = await this._getGrantedChildItems(this.character.ancestry, selectedAncestryData);

        // Enrich ancestry description as well
        if (selectedAncestryData?.system?.description) {
          selectedAncestryData.system.description = await TextEditor.enrichHTML(selectedAncestryData.system.description, { async: true });
        }
      }

      // Some edges (e.g. Arcane Backgrounds) and hindrances grant other edges/hindrances as
      // child items, the same way an ancestry grants ancestral abilities. Build the same kind
      // of nested display data for each selected edge/hindrance, keyed by its own uuid.
      const edgeChildItems = {};
      for (const uuid of Object.keys(this.character.edges || {})) {
        const children = await this._getGrantedChildItems(uuid);
        if (children.length) edgeChildItems[uuid] = children;
      }

      const hindranceChildItems = {};
      for (const uuid of Object.keys(this.character.hindrances || {})) {
        const children = await this._getGrantedChildItems(uuid);
        if (children.length) hindranceChildItems[uuid] = children;
      }

      const derivedStats = calculateDerivedStats(this.character);
      const attributePointsUsed = calculateTotalAttributePoints(this.character);
      const skillPointsUsed = calculateTotalSkillPoints(this.character, this._getSkillCompendiumMap());
      const skillPointBreakdown = getSkillPointBreakdown(this.character, this._getSkillCompendiumMap());
      const availablePerkPoints = getAvailablePerkPoints(this.character);
      const perkSlots = generatePerkSlots(this.character);
      const ancestryBonuses = selectedAncestryData ? getAncestryAttributeBonuses(selectedAncestryData, childItemsData) : {};
      const bonusEdgePointAbilityNames = (game.settings.get(MODULE_ID, 'bonusEdgePointAbilityNames') || '')
        .split(',');
      const ancestryBonusEdgePoints = calculateAncestryBonusEdgePoints(childItemsData, bonusEdgePointAbilityNames);
      const edgePointsAvailable = calculateAvailableEdgePoints(this.character) + ancestryBonusEdgePoints;
      const edgePointsUsed = calculateUsedEdgePoints(this.character);
      const bonusAttributePoints = calculateBonusAttributePoints(this.character);
      const bonusSkillPoints = calculateBonusSkillPoints(this.character);
      const gearCost = calculateGearCost(this.character);

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
        edgeChildItems: edgeChildItems,
        hindranceChildItems: hindranceChildItems,
        ancestries: this.compendiumData.ancestries,
        skills: this.compendiumData.skills,
        edges: this.compendiumData.edges,
        hindrances: this.compendiumData.hindrances,
        gearItems: this.compendiumData.gear,
        skillsByAttribute: this.skillsByAttribute,
        derivedStats: derivedStats,
        attributePointsUsed: attributePointsUsed,
        attributePointsRemaining: (5 + bonusAttributePoints) - attributePointsUsed,
        bonusAttributePoints: bonusAttributePoints,
        skillPointsUsed: skillPointsUsed,
        skillPointsRemaining: (12 + bonusSkillPoints) - skillPointsUsed,
        bonusSkillPoints: bonusSkillPoints,
        skillPointBreakdown: skillPointBreakdown,
        availablePerkPoints: availablePerkPoints,
        perkPointsSpent: perkPointsSpent,
        edgePointsAvailable: edgePointsAvailable,
        edgePointsUsed: edgePointsUsed,
        gearCost: gearCost,
        // Starting funds come from SWADE's native pcStartingCurrency setting (doubled, per
        // SWADE's own starting-funds convention) rather than a module-hardcoded number, so it
        // stays correct if a GM changes that setting for their table.
        gearBudget: currencyAmount,
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
        attributeDescriptions: ATTRIBUTE_DESCRIPTIONS,
        attributeTips: ATTRIBUTE_TIPS,
      };

      // Snapshot for the Save confirmation check — cheaper to read back here than to
      // recompute (edge points in particular depend on ancestry child items, which are
      // async and already resolved above during this same getData() pass).
      this._budgetSnapshot = {
        attributePointsRemaining: data.attributePointsRemaining,
        skillPointsRemaining: data.skillPointsRemaining,
        edgePointsRemaining: edgePointsAvailable - edgePointsUsed,
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
        const confirmed = await this._confirmUnspentPoints();
        if (!confirmed) return;
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

    const seenUuids = new Set();

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
          fromAncestry: this.character.skills[skill.uuid]?.fromAncestry || false,
          description: skill.description || '',
        });
        seenUuids.add(skill.uuid);
      }
    }

    // Include skills the actor has that aren't in the configured compendium (e.g. added
    // from another source) so they still display — the compendium is only a suggestion
    // list, not a filter on what can show up here.
    for (const [uuid, skillData] of Object.entries(this.character.skills || {})) {
      if (seenUuids.has(uuid) || !skillData.die) continue;

      const attrLink = skillData.attribute || 'smarts';
      if (!this.skillsByAttribute[attrLink]) continue;

      this.skillsByAttribute[attrLink].push({
        uuid,
        name: skillData.name || '(unknown skill)',
        isCoreSkill: isFreeCoreSkill(skillData.name),
        die: skillData.die,
        fromAncestry: skillData.fromAncestry || false,
        description: skillData.description || '',
        external: true,
      });
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

  /**
   * Fetch the full item data for anything an item grants via `system.grants` (ancestral
   * abilities from an Ancestry, or edges/hindrances granted by things like Arcane Background
   * edges), enriched and with per-item expand state — the same shape used for the Ancestry
   * tab's "Ancestral Abilities" list, reused here for Edges/Hindrances child items.
   *
   * @param {string} itemUuid - uuid of the granting item (used to fetch it if not preloaded)
   * @param {Object} [itemData] - already-fetched item data, to avoid a redundant fetch
   * @returns {Promise<Array>} Array of granted item data, each with an `isExpanded` flag
   */
  async _getGrantedChildItems(itemUuid, itemData = null) {
    const parentData = itemData || await getItemPreview(itemUuid);
    const children = [];

    if (!Array.isArray(parentData?.system?.grants)) {
      return children;
    }

    for (const grant of parentData.system.grants) {
      try {
        const childData = await getItemPreview(grant.uuid);
        if (childData) {
          if (childData.system?.description) {
            childData.system.description = await TextEditor.enrichHTML(childData.system.description, { async: true });
          }
          childData.isExpanded = this.character.expandedChildItems[childData.uuid] || false;
          children.push(childData);
        }
      } catch (e) {
        console.warn('[Character Manager] Failed to load granted item:', grant.uuid);
      }
    }

    return children;
  }

  /**
   * Detect skills already on the actor (embedded Items, not system.skills) and map them to
   * matching compendium skill entries by name. Skills that aren't in the configured
   * compendium are still included, keyed by their own item uuid, with enough of their own
   * data (name/attribute/description) to display standalone — the compendium is only a
   * suggestion source, not a filter on what's allowed to appear.
   */
  async _detectSkillsFromActor(actor) {
    const skills = {};
    const sidesToDie = { 4: 'd4', 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12' };

    for (const skillItem of actor.items.filter(item => item.type === 'skill')) {
      // Unskilled Attempt is a catch-all every actor has; it's never player-selected
      // or changed, so it's excluded from detection entirely (added back at save time).
      if (skillItem.name.toLowerCase() === 'unskilled attempt') continue;

      const compendiumSkill = this.compendiumData.skills.find(
        s => s.name.toLowerCase() === skillItem.name.toLowerCase()
      );

      let die = 'd4';
      const dieValue = skillItem.system?.die;
      if (dieValue && typeof dieValue === 'object' && dieValue.sides) {
        die = sidesToDie[dieValue.sides] || 'd4';
      } else if (typeof dieValue === 'string') {
        die = dieValue;
      }

      const grantedByAncestry = !!skillItem.grantedBy;
      const key = compendiumSkill?.uuid || skillItem.uuid;
      skills[key] = {
        die,
        advances: skillItem.system?.advances ?? 0,
        fromAncestry: grantedByAncestry,
        // Baseline die granted for free; increases above this still cost points
        grantedDie: grantedByAncestry ? die : undefined,
        // Only needed as a display/cost fallback when this skill isn't in the compendium
        name: compendiumSkill ? undefined : skillItem.name,
        attribute: compendiumSkill ? undefined : (skillItem.system?.attribute || 'smarts'),
        description: compendiumSkill ? undefined : (skillItem.system?.description || ''),
      };
    }

    return skills;
  }

  /**
   * Detect edges already on the actor (embedded Items, not system.edges) and map them to
   * matching compendium edge entries by name. Edges that aren't in the configured compendium
   * are still included, keyed by their own item uuid and built entirely from the actor's own
   * item data — the compendium is only a suggestion source, not a filter on what can display.
   * Excludes edges granted by another item (e.g. ancestral abilities) via `item.grantedBy`,
   * since those are automatic bonuses, not player choices made on this tab.
   */
  async _detectEdgesFromActor(actor) {
    const edges = {};

    for (const edgeItem of actor.items.filter(item => item.type === 'edge' && !item.grantedBy)) {
      const compendiumEdge = this.compendiumData.edges.find(
        e => e.name.toLowerCase() === edgeItem.name.toLowerCase()
      );

      const key = compendiumEdge?.uuid || edgeItem.uuid;
      const requirements = Array.isArray(edgeItem.system?.requirements)
        ? edgeItem.system.requirements.map(r => (typeof r?.toString === 'function' ? r.toString() : '')).filter(Boolean)
        : compendiumEdge?.requirements || [];

      edges[key] = {
        uuid: key,
        name: compendiumEdge?.name || edgeItem.name,
        expanded: false,
        img: edgeItem.img || compendiumEdge?.img || '',
        requirements,
        description: edgeItem.system?.description
          ? await TextEditor.enrichHTML(edgeItem.system.description, { async: true })
          : '',
      };
    }

    return edges;
  }

  /**
   * Detect hindrances already on the actor (embedded Items, not system.hindrances) and map
   * them to matching compendium hindrance entries by name. Hindrances that aren't in the
   * configured compendium are still included, keyed by their own item uuid and built
   * entirely from the actor's own item data — the compendium is only a suggestion source,
   * not a filter on what can display.
   * Excludes hindrances granted by another item (e.g. ancestral abilities) via `item.grantedBy`,
   * since those are automatic bonuses, not player choices made on this tab.
   */
  async _detectHindrancesFromActor(actor) {
    const hindrances = {};

    for (const hindranceItem of actor.items.filter(item => item.type === 'hindrance' && !item.grantedBy)) {
      const compendiumHindrance = this.compendiumData.hindrances.find(
        h => h.name.toLowerCase() === hindranceItem.name.toLowerCase()
      );

      const key = compendiumHindrance?.uuid || hindranceItem.uuid;
      const major = hindranceItem.system?.major ?? compendiumHindrance?.major ?? false;

      hindrances[key] = {
        uuid: key,
        name: compendiumHindrance?.name || hindranceItem.name,
        major,
        severity: hindranceItem.system?.severity ?? compendiumHindrance?.severity ?? 'either',
        points: major ? 2 : 1,
        expanded: false,
        img: hindranceItem.img || compendiumHindrance?.img || '',
        description: hindranceItem.system?.description
          ? await TextEditor.enrichHTML(hindranceItem.system.description, { async: true })
          : '',
      };
    }

    return hindrances;
  }

  /**
   * Detect gear already on the actor (embedded Items of type gear/weapon/armor/shield) and
   * map them to matching compendium entries by name. Items that aren't in the configured
   * compendiums are still included, keyed by their own item uuid and built entirely from the
   * actor's own item data — the compendium is only a suggestion source, not a filter on what
   * can display. Excludes items granted by another item (e.g. ancestral abilities), same as
   * Edges/Hindrances detection.
   */
  async _detectGearFromActor(actor) {
    const gear = {};

    for (const gearItem of actor.items.filter(item => ['gear', 'weapon', 'armor', 'shield'].includes(item.type) && !item.grantedBy)) {
      const compendiumGear = this.compendiumData.gear.find(
        g => g.name.toLowerCase() === gearItem.name.toLowerCase()
      );

      const key = compendiumGear?.uuid || gearItem.uuid;
      gear[key] = {
        uuid: key,
        name: compendiumGear?.name || gearItem.name,
        price: compendiumGear?.price ?? gearItem.system?.price ?? 0,
        quantity: gearItem.system?.quantity ?? 1,
        minStr: compendiumGear?.minStr ?? gearItem.system?.minStr ?? null,
        expanded: false,
        img: gearItem.img || compendiumGear?.img || '',
        description: gearItem.system?.description
          ? await TextEditor.enrichHTML(gearItem.system.description, { async: true })
          : '',
      };
    }

    return gear;
  }

  async _updateObject(event, formData) {
    // No-op on standard form submission
    return;
  }

  /**
   * Replace the actor's gear/weapon/armor/shield items with the current selections,
   * same create-embedded-with-compendiumUuid-flag pattern as Ancestry. Existing gear-type
   * items are wiped first (rather than diffed) since this always writes the full set.
   */
  async _saveGearToActor(actor) {
    // Resolve every selected item's full data BEFORE deleting the actor's existing gear —
    // a non-compendium selection's uuid points at that existing embedded item itself, so
    // deleting first would make it unresolvable when rebuilding it below.
    const newItemsData = [];
    for (const gearData of Object.values(this.character.gear || {})) {
      const gearItem = await fromUuid(gearData.uuid);
      if (!gearItem) continue;

      const itemData = gearItem.toObject();
      delete itemData._id;
      itemData.system.quantity = gearData.quantity ?? 1;
      newItemsData.push({ itemData, compendiumUuid: gearData.uuid });
    }

    const existingGear = actor.items.filter(item => ['gear', 'weapon', 'armor', 'shield'].includes(item.type) && !item.grantedBy);
    if (existingGear.length > 0) {
      await actor.deleteEmbeddedDocuments('Item', existingGear.map(i => i.id));
    }

    for (const { itemData, compendiumUuid } of newItemsData) {
      const created = await actor.createEmbeddedDocuments('Item', [itemData]);
      if (created.length > 0) {
        await created[0].setFlag('swade-fantasy-world-kit', 'compendiumUuid', compendiumUuid);
      }
    }
  }

  /**
   * Block the save with a confirmation dialog if the character still has unspent Attribute,
   * Skill, or Edge points — a likely mistake worth catching before it's written to the actor.
   * Leftover Hindrance points and gear silver are intentionally NOT checked here: taking
   * fewer hindrances or not spending every last coin isn't a mistake the way an unspent
   * creation point usually is.
   *
   * @returns {Promise<boolean>} True if the user confirmed (or nothing was unspent)
   */
  async _confirmUnspentPoints() {
    const snapshot = this._budgetSnapshot || {};
    const unspent = [];
    if ((snapshot.attributePointsRemaining ?? 0) > 0) {
      unspent.push(`${snapshot.attributePointsRemaining} attribute point${snapshot.attributePointsRemaining === 1 ? '' : 's'}`);
    }
    if ((snapshot.skillPointsRemaining ?? 0) > 0) {
      unspent.push(`${snapshot.skillPointsRemaining} skill point${snapshot.skillPointsRemaining === 1 ? '' : 's'}`);
    }
    if ((snapshot.edgePointsRemaining ?? 0) > 0) {
      unspent.push(`${snapshot.edgePointsRemaining} edge point${snapshot.edgePointsRemaining === 1 ? '' : 's'}`);
    }

    if (unspent.length === 0) return true;

    const result = await Dialog.confirm({
      title: 'Unspent Points',
      content: `<p>This character still has unspent ${unspent.join(', ')}. Save anyway?</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false,
    });

    return result === true;
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

        await this._saveGearToActor(this.actor);

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

        await this._saveGearToActor(newActor);

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

Handlebars.registerHelper('multiply', (a, b) => (a ?? 0) * (b ?? 0));

Handlebars.registerHelper('capitalize', (str) => {
  if (typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
});

window.CharacterManager = CharacterManager;
