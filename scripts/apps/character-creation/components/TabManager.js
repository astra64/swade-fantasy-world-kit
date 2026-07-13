/**
 * Tab navigation manager
 * Handles tab switching, active states, and button creation
 */
export class TabManager {
  constructor(options = {}) {
    this.currentTab = options.currentTab || 'concept';
  }

  /**
   * Setup tab navigation UI
   * @param {jQuery} html - FormApplication html
   * @param {Function} onTabSwitch - callback when tab switches
   */
  setup(html, onTabSwitch) {
    const existingNav = html.find('.form-tabs .tab-navigation');

    if (existingNav.length === 0) {
      this._createTabNavigation(html);
    }

    html.find('.tab-navigation .tab-btn').on('click', (event) => {
      event.preventDefault();
      const tabName = event.target.dataset.tab;
      this.switchTab(html, tabName, onTabSwitch);
    });
  }

  /**
   * Create tab navigation buttons from tab elements
   */
  _createTabNavigation(html) {
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

      if (tabName === this.currentTab) button.classList.add('active');

      tabNav.appendChild(button);
    });

    html.find('.form-tabs').prepend(tabNav);
  }

  /**
   * Switch to a different tab
   */
  switchTab(html, tabName, onTabSwitch) {
    this.currentTab = tabName;

    html.find('.form-tabs .tab').removeClass('active');
    html.find(`.form-tabs .tab[data-tab="${tabName}"]`).addClass('active');

    html.find('.tab-navigation .tab-btn').removeClass('active');
    html.find(`.tab-navigation .tab-btn[data-tab="${tabName}"]`).addClass('active');

    if (onTabSwitch) {
      onTabSwitch(tabName);
    }
  }
}
