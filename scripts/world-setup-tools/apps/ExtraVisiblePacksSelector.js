const MODULE_ID = "swade-fantasy-world-kit";

export class ExtraVisiblePacksSelector extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-pack-selector`,
      classes: ["scfc-pack-selector"],
      title: "SWADE Fantasy World Kit: Choose Visible Packs",
      template: `modules/${MODULE_ID}/templates/pack-selector.hbs`,
      width: 640,
      height: 720,
      resizable: true,
      minimizable: true,
      popOut: true,
      minWidth: 560,
      minHeight: 480,
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  getData() {
    const parseVisiblePackList = (rawValue) => {
      if (!rawValue) return new Set();
      return new Set(String(rawValue).split("\n").map((s) => s.trim()).filter(Boolean));
    };

    const selected = parseVisiblePackList(game.settings.get(MODULE_ID, "extraVisiblePacks"));
    const ownedPrefix = `${MODULE_ID}.`;
    let ownedPackCount = 0;
    const activeModuleIds = new Set(
      [...game.modules.values()].filter((m) => m.active && m.id !== MODULE_ID).map((m) => m.id)
    );
    const packs = [...game.packs.values()]
      .filter((pack) => {
        if (pack.collection.startsWith(ownedPrefix)) { ownedPackCount++; return false; }
        return true;
      })
      .map((pack) => {
        const id = pack.collection;
        const label = pack.metadata?.label ?? id;
        const moduleId = id.split(".")[0] ?? "";
        return {
          id,
          label,
          moduleId,
          isActiveModule: activeModuleIds.has(moduleId),
          selected: selected.has(id),
          searchText: `${id} ${label} ${moduleId}`.toLowerCase()
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    return {
      packs,
      hasPacks: packs.length > 0,
      ownedPackCount
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    const searchInput = html[0].querySelector("[data-pack-search]");
    const packRows = [...html[0].querySelectorAll("[data-pack-row]")];
    const selectAllButton = html[0].querySelector("[data-pack-select-all]");
    const clearAllButton = html[0].querySelector("[data-pack-clear-all]");
    const selectActiveModuleButton = html[0].querySelector("[data-pack-select-active-modules]");

    searchInput?.addEventListener("input", (event) => {
      const term = (event.currentTarget.value ?? "").toLowerCase().trim();

      for (const row of packRows) {
        const searchText = (row.dataset.search ?? "").toLowerCase();
        const visible = !term || searchText.includes(term);
        row.style.display = visible ? "" : "none";
      }
    });

    selectAllButton?.addEventListener("click", () => {
      for (const row of packRows) {
        if (row.style.display === "none") continue;
        const checkbox = row.querySelector("input[type=checkbox]");
        if (checkbox) checkbox.checked = true;
      }
    });

    clearAllButton?.addEventListener("click", () => {
      for (const row of packRows) {
        if (row.style.display === "none") continue;
        const checkbox = row.querySelector("input[type=checkbox]");
        if (checkbox) checkbox.checked = false;
      }
    });

    selectActiveModuleButton?.addEventListener("click", () => {
      for (const row of packRows) {
        if (row.dataset.activeModule !== "true") continue;
        const checkbox = row.querySelector("input[type=checkbox]");
        if (checkbox) checkbox.checked = true;
      }
    });
  }

  async _updateObject(_event, formData) {
    const values = formData.packs;
    const selected = Array.isArray(values) ? values : (values ? [values] : []);
    const normalized = [...new Set(selected.map((entry) => String(entry).trim()).filter(Boolean))];

    await game.settings.set(MODULE_ID, "extraVisiblePacks", normalized.join("\n"));
    await window.handleVisibilitySettingsChanged();
  }
}
