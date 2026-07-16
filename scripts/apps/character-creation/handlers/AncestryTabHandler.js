import { BaseTabHandler } from './BaseTabHandler.js';

export class AncestryTabHandler extends BaseTabHandler {
  getTabName() {
    return 'ancestry';
  }

  getCompendiumPackKey() {
    return 'ancestries';
  }

  getCompendiumPackLabel() {
    return 'Ancestries';
  }

  getDropdownConfig() {
    return {
      items: this.characterManager.compendiumData.ancestries,
      placeholder: 'Select Ancestry...',
      onSelect: (ancestry) => this._selectAncestry(ancestry),
    };
  }

  getDropdownContainerSelector() {
    return '.ancestry-search-container';
  }

  getAddButtonSelector() {
    return 'button[data-action="add-ancestry"]';
  }

  getCompendiumButtonSelector() {
    return 'button[data-action="open-ancestry-compendium"]';
  }

  getClearSearchButtonSelector() {
    return 'button[data-action="clear-ancestry-search"]';
  }

  getSearchInputSelector() {
    return '.ancestry-search';
  }

  _handleDragDrop(uuid) {
    this._selectAncestry({ uuid });
  }

  _setupCustomHandlers() {
    // Setup remove button
    this._setupRemoveHandler(
      '[data-action="remove-ancestry"]',
      this._removeAncestry,
      () => null
    );

    // Setup open item button
    this._setupOpenItemHandler('[data-action="open-ancestry-item"]');

    // Setup expand/collapse
    this._setupExpandToggleHandler(
      '[data-action="toggle-ancestry-expand"]',
      () => this.characterManager.character.expandedAncestry,
      (val) => { this.characterManager.character.expandedAncestry = val; }
    );

    // Setup child item expand/collapse
    this.html.find('[data-action="toggle-child-expand"]').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uuid = $(e.currentTarget).closest('[data-action="toggle-child-expand"]').attr('data-item-uuid');
      this.characterManager.character.expandedChildItems[uuid] = !this.characterManager.character.expandedChildItems[uuid];
      if (this.characterManager.character.expandedChildItems[uuid]) {
        this.characterManager.pendingScrollTarget = `[data-action="toggle-child-expand"][data-item-uuid="${uuid}"] .ancestry-item-header`;
      }
      this.characterManager.render();
    });

    // Setup open child item button
    this._setupOpenItemHandler('[data-action="open-child-item"]');
  }

  async _selectAncestry(ancestry) {
    this.characterManager.character.ancestry = ancestry.uuid;
    this.characterManager.render();
  }

  _removeAncestry() {
    this.characterManager.character.ancestry = null;
    this.characterManager.character.expandedAncestry = false;
    this.characterManager.render();
  }
}
