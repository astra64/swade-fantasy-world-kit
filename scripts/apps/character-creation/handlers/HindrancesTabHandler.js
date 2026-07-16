import { BaseTabHandler } from './BaseTabHandler.js';
import { getItemPreview } from '../lib/compendium-utils.js';
import { calculateTotalHindrancePoints, getRemainingHindrancePoints, generatePerkSlots } from '../lib/calculator.js';

export class HindrancesTabHandler extends BaseTabHandler {
  getTabName() {
    return 'hindrances';
  }

  getCompendiumPackKey() {
    return 'hindrances';
  }

  getCompendiumPackLabel() {
    return 'Hindrances';
  }

  getDropdownConfig() {
    const availableHindrances = this.characterManager.compendiumData.hindrances.filter(
      h => !this.characterManager.character.hindrances?.[h.uuid]
    );
    return {
      items: availableHindrances,
      placeholder: 'Select Hindrance...',
      onSelect: (hindrance) => this._addHindrance(hindrance),
      inputSelector: '.hindrances-search',
      menuSelector: '.hindrances-dropdown-menu',
      optionClass: 'dropdown-option',
    };
  }

  getDropdownContainerSelector() {
    return '.search-container';
  }

  getAddButtonSelector() {
    return 'button[data-action="add-hindrance"]';
  }

  getCompendiumButtonSelector() {
    return 'button[data-action="open-hindrances-compendium"]';
  }

  getClearSearchButtonSelector() {
    return 'button[data-action="clear-hindrances-search"]';
  }

  getSearchInputSelector() {
    return '.hindrances-search';
  }

  _handleDragDrop(uuid) {
    this._addHindranceByUuid(uuid);
  }

  _setupCustomHandlers() {
    // Setup expand/collapse toggle
    this._setupExpandToggleHandler(
      '[data-action="toggle-hindrance-expand"]',
      () => {
        const uuid = this.html.find('[data-action="toggle-hindrance-expand"]').attr('data-item-uuid');
        return this.characterManager.character.hindrances?.[uuid]?.expanded || false;
      },
      (val) => {
        const uuid = this.html.find('[data-action="toggle-hindrance-expand"]').attr('data-item-uuid');
        if (this.characterManager.character.hindrances?.[uuid]) {
          this.characterManager.character.hindrances[uuid].expanded = val;
        }
      }
    );

    // Setup open item button
    this._setupOpenItemHandler('[data-action="open-hindrance-item"]');

    // Setup remove buttons
    this._setupRemoveHandler(
      '[data-action="remove-hindrance"]',
      this._removeHindrance,
      (e) => $(e.currentTarget).closest('[data-item-uuid]')?.attr('data-item-uuid')
          || $(e.currentTarget).closest('.hindrance-item').find('[data-item-uuid]').attr('data-item-uuid')
    );

    // Setup major/minor radio toggles
    this.html.find('input[data-action="set-hindrance-major"]').on('change', (e) => {
      const uuid = $(e.currentTarget).attr('data-item-uuid');
      this._setHindranceMajor(uuid, true);
    });

    this.html.find('input[data-action="set-hindrance-minor"]').on('change', (e) => {
      const uuid = $(e.currentTarget).attr('data-item-uuid');
      this._setHindranceMajor(uuid, false);
    });

    // Setup perk point allocation dropdowns (multi-slot)
    this.html.find('select[data-action="set-slot-tradeoff"]').on('change', (e) => {
      const slotIndex = parseInt($(e.currentTarget).attr('data-slot-index'));
      const selectedValue = e.target.value;
      this._handlePerkChange(slotIndex, selectedValue);
    });
  }

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

  async _addHindranceByUuid(uuid) {
    // Find the hindrance in compendium data
    const hindrance = this.characterManager.compendiumData.hindrances.find(h => h.uuid === uuid);
    if (hindrance) {
      this._addHindrance(hindrance);
    } else {
      console.warn('[Hindrances] Could not find hindrance:', uuid);
    }
  }

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

  _removeHindrance(uuid) {
    if (this.characterManager.character.hindrances?.[uuid]) {
      delete this.characterManager.character.hindrances[uuid];
      this.characterManager.render();
    }
  }

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

  _getTotalPoints() {
    return calculateTotalHindrancePoints(this.characterManager.character);
  }
}
