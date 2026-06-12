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

    const extractSettingName = (packName) => {
      const match = packName.match(/-([a-z]+)$/);
      return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : packName;
    };

    const selected = parseVisiblePackList(game.settings.get(MODULE_ID, "extraVisiblePacks"));
    const ownedPrefix = `${MODULE_ID}.`;
    const activeModuleIds = new Set(
      [...game.modules.values()].filter((m) => m.active && m.id !== MODULE_ID).map((m) => m.id)
    );
    const packs = [...game.packs.values()]
      .map((pack) => {
        const id = pack.collection;
        const label = pack.metadata?.label ?? id;
        const firstPart = id.split(".")[0] ?? "";

        let moduleId, moduleName, isActiveModule;

        if (firstPart === MODULE_ID) {
          const packName = id.split(".")[1] ?? "";
          const settingName = extractSettingName(packName);
          moduleId = MODULE_ID;
          moduleName = settingName;
          isActiveModule = true;
        } else {
          moduleId = firstPart;
          const module = game.modules.get(moduleId);
          moduleName = module?.title ?? moduleId;
          isActiveModule = activeModuleIds.has(moduleId);
        }

        console.debug(`[Pack Selector] ${id}: moduleId=${moduleId}, moduleName=${moduleName}, isActive=${isActiveModule}`);
        return {
          id,
          label,
          moduleId,
          moduleName,
          isActiveModule,
          selected: selected.has(id),
          searchText: `${id} ${label} ${moduleId} ${moduleName}`.toLowerCase()
        };
      })
      .sort((a, b) => {
        const moduleCompare = a.moduleName.localeCompare(b.moduleName);
        return moduleCompare !== 0 ? moduleCompare : a.label.localeCompare(b.label);
      });

    return {
      packs,
      hasPacks: packs.length > 0
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
