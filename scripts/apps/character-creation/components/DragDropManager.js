/**
 * Reusable drag-drop manager for accepting items
 * Handles visual feedback and item drop events
 */
export class DragDropManager {
  constructor(options = {}) {
    this.onDrop = options.onDrop || (() => {});
    this.tabName = options.tabName || 'ancestry';
  }

  /**
   * Setup drag-drop handlers on a tab
   * @param {jQuery} html - FormApplication html
   */
  setup(html) {
    const tab = html.find(`.tab[data-tab="${this.tabName}"]`);

    tab.on('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tab.addClass('dragover');
    });

    tab.on('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tab.removeClass('dragover');
    });

    tab.on('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tab.removeClass('dragover');

      const data = e.originalEvent.dataTransfer.getData('text/plain');
      try {
        const dragData = JSON.parse(data);
        if (dragData.type === 'Item' && dragData.uuid) {
          this.onDrop(dragData.uuid);
        }
      } catch (error) {
        console.warn('[Character Manager] Invalid drag data:', error);
      }
    });
  }
}
