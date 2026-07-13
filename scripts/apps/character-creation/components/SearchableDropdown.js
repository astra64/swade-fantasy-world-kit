/**
 * Reusable searchable dropdown component
 * Shows all options on focus, filters as user types
 */
export class SearchableDropdown {
  constructor(options = {}) {
    this.items = options.items || [];
    this.onSelect = options.onSelect || (() => {});
    this.placeholder = options.placeholder || 'Search...';
    this.html = null;
    this.input = null;
    this.menu = null;
    this.addBtn = null;
  }

  /**
   * Initialize the dropdown in HTML element
   * @param {jQuery} container - jQuery element with .ancestry-search-container
   * @param {jQuery} addButton - jQuery element for add button
   */
  setup(container, addButton) {
    this.html = container;
    this.input = container.find('.ancestry-search');
    this.menu = container.find('.ancestry-dropdown-menu');
    this.addBtn = addButton;

    this.input.attr('placeholder', this.placeholder);

    this.input.on('focus', () => this._showMenu());
    this.input.on('input', () => this._showMenu());
    this.input.on('blur', () => this._hideMenu());

    this.addBtn.on('click', (e) => {
      e.preventDefault();
      this._handleAdd();
    });
  }

  /**
   * Render dropdown menu with filtered items
   */
  _showMenu() {
    const filter = this.input.val().toLowerCase();
    this.menu.empty();

    const filtered = this.items.filter(item =>
      item.name.toLowerCase().includes(filter)
    );

    if (filtered.length === 0) {
      this.menu.html(
        '<div class="ancestry-option" style="color: var(--color-text-dark-primary); opacity: 0.5;">No results</div>'
      );
    } else {
      filtered.forEach(item => {
        const option = document.createElement('div');
        option.className = 'ancestry-option';
        option.textContent = item.name;
        option.addEventListener('click', () => {
          this.input.val(item.name);
          this._hideMenu();
        });
        this.menu.append(option);
      });
    }

    this.menu.addClass('show');
  }

  /**
   * Hide dropdown menu
   */
  _hideMenu() {
    setTimeout(() => this.menu.removeClass('show'), 200);
  }

  /**
   * Handle Add button click
   */
  _handleAdd() {
    const itemName = this.input.val();
    if (itemName) {
      const item = this.items.find(a => a.name === itemName);
      if (item) {
        this.onSelect(item);
        this.input.val('');
        this._hideMenu();
      }
    }
  }

  /**
   * Update items list
   */
  setItems(items) {
    this.items = items;
  }
}
