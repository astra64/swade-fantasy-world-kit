/**
 * Hindrances Tab Handler
 * Manages hindrance selection, trade-offs, and point tracking
 */
import { SearchableDropdown } from '../components/SearchableDropdown.js';
import { DragDropManager } from '../components/DragDropManager.js';
import { getItemPreview } from '../lib/compendium-utils.js';
import { calculateTotalHindrancePoints, getRemainingHindrancePoints, generatePerkSlots } from '../lib/calculator.js';
import { COMPENDIUM_PACKS } from '../constants.js';

export class HindrancesTabHandler {
  constructor(characterManager) {
    this.characterManager = characterManager;
    this.dropdown = null;
    this.dragDrop = null;
  }

  /**
   * Setup hindrances tab UI and handlers
   */
  setup(html) {
    // Setup searchable dropdown for adding hindrances
    this.dropdown = new SearchableDropdown({
      items: this.characterManager.compendiumData.hindrances,
      placeholder: 'Select Hindrance...',
      onSelect: (hindrance) => this._addHindrance(hindrance),
      inputSelector: '.hindrances-search',
      menuSelector: '.hindrances-dropdown-menu',
      optionClass: 'dropdown-option',
    });

    const container = html.find('.search-container');
    const addBtn = html.find('button[data-action="add-hindrance"]');
    this.dropdown.setup(container, addBtn);

    // Setup compendium browser button
    html.find('button[data-action="open-hindrances-compendium"]').on('click', (e) => {
      e.preventDefault();
      this._openCompendium();
    });

    // Setup expand/collapse toggle
    html.find('[data-action="toggle-hindrance-expand"]').on('click', (e) => {
      e.preventDefault();
      const uuid = $(e.currentTarget).attr('data-item-uuid');
      this._toggleHindranceExpand(uuid);
    });

    // Setup open item button
    html.find('[data-action="open-hindrance-item"]').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uuid = $(e.currentTarget).attr('data-uuid');
      this._openHindranceItem(uuid);
    });

    // Setup remove buttons
    html.find('[data-action="remove-hindrance"]').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uuid = $(e.currentTarget).closest('[data-item-uuid]')?.attr('data-item-uuid')
                || $(e.currentTarget).closest('.hindrance-item').find('[data-item-uuid]').attr('data-item-uuid');
      this._removeHindrance(uuid);
    });

    // Setup major/minor radio toggles
    html.find('input[data-action="set-hindrance-major"]').on('change', (e) => {
      const uuid = $(e.currentTarget).attr('data-item-uuid');
      this._setHindranceMajor(uuid, true);
    });

    html.find('input[data-action="set-hindrance-minor"]').on('change', (e) => {
      const uuid = $(e.currentTarget).attr('data-item-uuid');
      this._setHindranceMajor(uuid, false);
    });

    // Setup perk point allocation dropdowns (multi-slot)
    html.find('select[data-action="set-slot-tradeoff"]').on('change', (e) => {
      const slotIndex = parseInt($(e.currentTarget).attr('data-slot-index'));
      const selectedValue = e.target.value;
      this._handlePerkChange(slotIndex, selectedValue);
    });

    // Setup drag-drop
    this.dragDrop = new DragDropManager({
      tabName: 'hindrances',
      onDrop: (uuid) => this._addHindranceByUuid(uuid),
    });
    this.dragDrop.setup(html);
  }

  /**
   * Toggle expand state for a hindrance
   */
  _toggleHindranceExpand(uuid) {
    if (this.characterManager.character.hindrances?.[uuid]) {
      this.characterManager.character.hindrances[uuid].expanded = !this.characterManager.character.hindrances[uuid].expanded;
      this.characterManager.render();
    }
  }

  /**
   * Open hindrance item from compendium
   */
  async _openHindranceItem(uuid) {
    const item = await fromUuid(uuid);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Add hindrance to character via dropdown selection
   */
  async _addHindrance(hindrance) {
    if (!hindrance || !hindrance.uuid) return;

    // Prevent adding same hindrance twice
    if (this.characterManager.character.hindrances?.[hindrance.uuid]) {
      ui.notifications.warn('This hindrance is already selected');
      return;
    }

    // Fetch full item data for image and description
    let itemData = null;
    try {
      itemData = await getItemPreview(hindrance.uuid);
    } catch (e) {
      console.warn('[Hindrances] Failed to fetch full item data:', e);
    }

    // Add to character hindrances
    if (!this.characterManager.character.hindrances) {
      this.characterManager.character.hindrances = {};
    }

    this.characterManager.character.hindrances[hindrance.uuid] = {
      uuid: hindrance.uuid,
      name: hindrance.name,
      major: hindrance.major,
      severity: itemData?.system?.severity || 'either',
      points: hindrance.major ? 2 : 1,
      expanded: false,
      img: itemData?.img || '',
      description: itemData?.system?.description ?
        await TextEditor.enrichHTML(itemData.system.description, { async: true }) : '',
    };

    this.characterManager.render();
  }

  /**
   * Add hindrance by UUID (used for drag-drop)
   */
  async _addHindranceByUuid(uuid) {
    // Find the hindrance in compendium data
    const hindrance = this.characterManager.compendiumData.hindrances.find(h => h.uuid === uuid);
    if (hindrance) {
      this._addHindrance(hindrance);
    } else {
      console.warn('[Hindrances] Could not find hindrance:', uuid);
    }
  }

  /**
   * Toggle hindrance between major and minor
   */
  async _setHindranceMajor(uuid, isMajor) {
    if (!this.characterManager.character.hindrances?.[uuid]) return;

    const hindrance = this.characterManager.character.hindrances[uuid];
    const oldPoints = hindrance.points;
    const newPoints = isMajor ? 2 : 1;

    // Check if change would exceed budget
    const currentPoints = this._getTotalPoints();
    const pointDifference = newPoints - oldPoints;
    if (currentPoints + pointDifference > 4) {
      ui.notifications.warn(`Changing to ${isMajor ? 'Major' : 'Minor'} would exceed the 4-point budget`);
      this.characterManager.render();
      return;
    }

    hindrance.major = isMajor;
    hindrance.points = newPoints;
    this.characterManager.render();
  }

  /**
   * Remove hindrance from character
   */
  _removeHindrance(uuid) {
    if (this.characterManager.character.hindrances?.[uuid]) {
      delete this.characterManager.character.hindrances[uuid];
      this.characterManager.render();
    }
  }


  /**
   * Handle perk point allocation dropdown change for a specific slot
   */
  _handlePerkChange(slotIndex, selectedValue) {
    if (!this.characterManager.character.perkPointAllocations) {
      this.characterManager.character.perkPointAllocations = [];
    }

    // Ensure slot exists with correct pointValue from generated slots
    if (!this.characterManager.character.perkPointAllocations[slotIndex]) {
      const slots = generatePerkSlots(this.characterManager.character);
      const slotData = slots[slotIndex] || { pointValue: 1, selected: null };
      this.characterManager.character.perkPointAllocations[slotIndex] = {
        pointValue: slotData.pointValue,
        selected: null
      };
    }

    // Update selected perk allocation
    this.characterManager.character.perkPointAllocations[slotIndex].selected = selectedValue || null;
    this.characterManager.render();
  }

  /**
   * Get total hindrance points currently spent
   */
  _getTotalPoints() {
    return calculateTotalHindrancePoints(this.characterManager.character);
  }

  /**
   * Open hindrances compendium browser
   */
  _openCompendium() {
    const packId = COMPENDIUM_PACKS.hindrances;
    const pack = game.packs.get(packId);

    if (pack) {
      pack.sheet.render(true);
    } else {
      ui.notifications.error('[Character Manager] Hindrances compendium not found');
    }
  }
}
