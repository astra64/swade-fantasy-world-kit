/**
 * Ancestry Tab Handler
 * Manages all ancestry-related functionality: selection, display, drag-drop
 */
import { SearchableDropdown } from '../components/SearchableDropdown.js';
import { DragDropManager } from '../components/DragDropManager.js';
import { getItemPreview } from '../lib/compendium-utils.js';
import { COMPENDIUM_PACKS } from '../constants.js';

export class AncestryTabHandler {
  constructor(characterManager) {
    this.characterManager = characterManager;
    this.dropdown = null;
    this.dragDrop = null;
  }

  /**
   * Setup ancestry tab UI and handlers
   */
  setup(html) {
    // Setup searchable dropdown
    this.dropdown = new SearchableDropdown({
      items: this.characterManager.compendiumData.ancestries,
      placeholder: 'Select Ancestry...',
      onSelect: (ancestry) => this._selectAncestry(ancestry),
    });

    const container = html.find('.ancestry-search-container');
    const addBtn = html.find('button[data-action="add-ancestry"]');
    this.dropdown.setup(container, addBtn);

    // Setup compendium browser button
    html.find('button[data-action="open-ancestry-compendium"]').on('click', (e) => {
      e.preventDefault();
      this._openCompendium();
    });

    // Setup remove button
    html.find('[data-action="remove-ancestry"]').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._removeAncestry();
    });

    // Setup open item button
    html.find('[data-action="open-ancestry-item"]').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._openAncestryItem();
    });

    // Setup expand/collapse
    html.find('[data-action="toggle-ancestry-expand"]').on('click', (e) => {
      e.preventDefault();
      this.characterManager.character.expandedAncestry = !this.characterManager.character.expandedAncestry;
      this.characterManager.render();
    });

    // Setup drag-drop
    this.dragDrop = new DragDropManager({
      tabName: 'ancestry',
      onDrop: (uuid) => this._selectAncestry({ uuid }),
    });
    this.dragDrop.setup(html);

    // Setup child item expand/collapse
    html.find('[data-action="toggle-child-expand"]').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uuid = $(e.currentTarget).closest('[data-action="toggle-child-expand"]').attr('data-item-uuid');
      this.characterManager.character.expandedChildItems[uuid] = !this.characterManager.character.expandedChildItems[uuid];
      this.characterManager.render();
    });

    // Setup open child item button
    html.find('[data-action="open-child-item"]').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uuid = $(e.currentTarget).attr('data-uuid');
      this._openChildItem(uuid);
    });
  }

  /**
   * Open the ancestry item from its source
   */
  async _openAncestryItem() {
    if (!this.characterManager.character.ancestry) return;

    const ancestryItem = await fromUuid(this.characterManager.character.ancestry);
    if (ancestryItem) {
      ancestryItem.sheet.render(true);
    }
  }

  /**
   * Open a child item
   */
  async _openChildItem(uuid) {
    const item = await fromUuid(uuid);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Select an ancestry
   */
  _selectAncestry(ancestry) {
    this.characterManager.character.ancestry = ancestry.uuid;
    this.characterManager.render();
  }

  /**
   * Remove selected ancestry
   */
  _removeAncestry() {
    this.characterManager.character.ancestry = null;
    this.characterManager.character.expandedAncestry = false;
    this.characterManager.render();
  }

  /**
   * Open compendium browser
   */
  _openCompendium() {
    const packId = COMPENDIUM_PACKS.ancestries;
    const pack = game.packs.get(packId);

    if (pack) {
      pack.sheet.render(true);
    } else {
      ui.notifications.error('[Character Manager] Ancestries compendium not found');
    }
  }
}
