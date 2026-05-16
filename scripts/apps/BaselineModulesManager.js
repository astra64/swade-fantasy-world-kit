const MODULE_ID = "swade-fantasy-world-kit";

export class BaselineModulesManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-baseline-modules`,
      classes: ["scfc-baseline-modules"],
      title: "SWADE Fantasy World Kit: Preset Modules",
      template: `modules/${MODULE_ID}/templates/baseline-modules.hbs`,
      width: 720,
      height: 760,
      resizable: true,
      minimizable: true,
      popOut: true,
      minWidth: 640,
      minHeight: 560,
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  getData() {
    // Use the globally-injected API methods from main.js
    const presetApi = window.swadeFwkPresetApi;
    const depApi = window.swadeFwkDependencyApi;
    const getRequiredModuleIds = window.getRequiredModuleIds;
    const getModuleDependencies = window.getModuleDependencies;
    const buildSelectionSignature = window.buildSelectionSignature;
    const parseTitlesMap = window.parseTitlesMap;
    const mergeWithRequiredModuleIds = window.mergeWithRequiredModuleIds;

    const requiredIds = new Set(getRequiredModuleIds());
    const selectedIds = new Set(presetApi.getActivePresetModuleIds());
    for (const id of requiredIds) selectedIds.add(id);
    const installedModules = [...game.modules.values()]
      .filter((module) => module.id !== MODULE_ID)
      .map((module) => {
        const id = module.id;
        const title = module.title ?? id;
        const searchText = `${title} ${id}`.toLowerCase();
        const dependencies = getModuleDependencies(id);
        const missingInstalledDependencies = dependencies.filter((depId) => {
          const depModule = game.modules.get(depId);
          return Boolean(depModule) && !depModule.active;
        });
        const missingUninstalledDependencies = dependencies.filter((depId) => !game.modules.has(depId));
        const missingInstalledDependencyLabel = missingInstalledDependencies
          .map((depId) => game.modules.get(depId)?.title ?? depId)
          .join(", ");
        const missingUninstalledDependencyLabel = missingUninstalledDependencies.join(", ");

        return {
          id,
          title,
          active: Boolean(module.active),
          required: requiredIds.has(id),
          selected: selectedIds.has(id),
          showDependencyIndicators: selectedIds.has(id) || Boolean(module.active),
          searchText,
          missingInstalledDependencyCount: missingInstalledDependencies.length,
          missingUninstalledDependencyCount: missingUninstalledDependencies.length,
          missingInstalledDependencyLabel,
          missingUninstalledDependencyLabel
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    const titlesMap = parseTitlesMap(game.settings.get(MODULE_ID, "baselineModuleTitles"));
    const configured = [...selectedIds]
      .filter((id) => id && String(id).trim().length > 0)
      .map((id) => {
        const module = game.modules.get(id);
        return {
          id,
          title: module?.title ?? titlesMap[id] ?? null,
          installed: Boolean(module),
          active: Boolean(module?.active)
        };
      });

    const installedCount = installedModules.length;
    const activeCount = installedModules.filter((entry) => entry.active).length;
    const selectedCount = installedModules.filter((entry) => entry.selected).length;
    const requiredCount = installedModules.filter((entry) => entry.required).length;
    const configuredCount = configured.length;
    const configuredInstalledCount = configured.filter((entry) => entry.installed).length;
    const configuredMissingCount = configuredCount - configuredInstalledCount;
    const baselineSelectionSignature = buildSelectionSignature([...selectedIds]);
    const activePreset = presetApi.getActivePresetMeta();
    const appliedPreset = presetApi.getAppliedPresetMeta();
    const presetMap = presetApi.getPresetMap();
    const presetsArray = Object.entries(presetMap).map(([id, preset]) => ({
      id,
      name: preset.name ?? id,
      moduleCount: preset.moduleIds?.length ?? 0,
      isActive: id === activePreset.id
    }));

    return {
      installedModules,
      hasInstalledModules: installedModules.length > 0,
      configured,
      hasConfigured: configured.length > 0,
      installedCount,
      activeCount,
      selectedCount,
      requiredCount,
      configuredCount,
      configuredInstalledCount,
      configuredMissingCount,
      baselineSelectionSignature,
      presets: presetsArray,
      activePresetName: activePreset.name,
      activePresetId: activePreset.id,
      activePresetModuleCount: activePreset.moduleCount,
      appliedPresetName: appliedPreset.name,
      appliedPresetId: appliedPreset.id,
      isEditingPresetApplied: activePreset.id === appliedPreset.id
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    const applyButton = html[0].querySelector("[data-apply-baseline]");
    const searchInput = html[0].querySelector("[data-module-search]");
    const moduleRows = [...html[0].querySelectorAll("[data-module-row]")];
    const selectActiveButton = html[0].querySelector("[data-module-select-active]");
    const filterActiveButton = html[0].querySelector("[data-module-filter-active]");
    const visibleCountLabel = html[0].querySelector("[data-module-visible-count]");
    const clearSelectionButton = html[0].querySelector("[data-module-clear-selection]");
    const revertPresetButton = html[0].querySelector("[data-revert-preset]");
    const baselineSaveStateLabel = html[0].querySelector("[data-baseline-save-state]");
    const selectionDeltaLabel = html[0].querySelector("[data-selection-delta]");
    const presetSelector = html[0].querySelector("[data-preset-selector]");
    const presetManageBtn = html[0].querySelector("[data-preset-manage]");

    const baselineSelectionSignature = html[0].dataset.baselineSelectionSignature ?? "";
    const baselineSelectionSet = new Set(baselineSelectionSignature ? baselineSelectionSignature.split("\n") : []);

    const getCurrentSelectionSignature = () => {
      const buildSelectionSignature = window.buildSelectionSignature;
      const selectedIds = [];
      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        if (!checkbox?.checked) continue;
        selectedIds.push(checkbox.value);
      }
      return buildSelectionSignature(selectedIds);
    };

    const updateBaselineSaveState = () => {
      if (!baselineSaveStateLabel) return;

      const hasUnsavedChanges = getCurrentSelectionSignature() !== baselineSelectionSignature;
      baselineSaveStateLabel.textContent = hasUnsavedChanges
        ? "Status: unsaved changes"
        : "Status: matches preset";
      baselineSaveStateLabel.classList.toggle("scfc-save-state-unsaved", hasUnsavedChanges);
      baselineSaveStateLabel.classList.toggle("scfc-save-state-saved", !hasUnsavedChanges);
      if (revertPresetButton) revertPresetButton.disabled = !hasUnsavedChanges;
    };

    const updateSelectionDelta = () => {
      if (!selectionDeltaLabel) return;

      const currentIds = new Set(getCurrentSelectionSignature().split("\n").filter(Boolean));
      let additions = 0;
      let removals = 0;

      for (const id of currentIds) {
        if (!baselineSelectionSet.has(id)) additions += 1;
      }
      for (const id of baselineSelectionSet) {
        if (!currentIds.has(id)) removals += 1;
      }

      if (additions === 0 && removals === 0) {
        selectionDeltaLabel.textContent = "No changes";
        selectionDeltaLabel.classList.remove("scfc-selection-delta-dirty");
        return;
      }

      selectionDeltaLabel.textContent = `+${additions} / -${removals}`;
      selectionDeltaLabel.classList.add("scfc-selection-delta-dirty");
    };

    const updateSelectionState = () => {
      updateBaselineSaveState();
      updateSelectionDelta();
    };

    let activeOnlyFilterEnabled = false;

    const updateActiveFilterButtonState = () => {
      if (!filterActiveButton) return;
      filterActiveButton.setAttribute("aria-pressed", activeOnlyFilterEnabled ? "true" : "false");
      filterActiveButton.classList.toggle("is-active", activeOnlyFilterEnabled);
      html[0].classList.toggle("scfc-active-filter-on", activeOnlyFilterEnabled);
    };

    const applyModuleFilters = () => {
      const term = (searchInput?.value ?? "").toLowerCase().trim();
      let visibleCount = 0;

      for (const row of moduleRows) {
        const searchText = (row.dataset.search ?? "").toLowerCase();
        const matchesSearch = !term || searchText.includes(term);
        const matchesActiveOnly = !activeOnlyFilterEnabled || row.dataset.active === "true";
        const isVisible = matchesSearch && matchesActiveOnly;
        row.style.display = isVisible ? "" : "none";
        if (isVisible) visibleCount += 1;
      }

      if (visibleCountLabel) {
        const totalCount = moduleRows.length;
        visibleCountLabel.textContent = activeOnlyFilterEnabled
          ? `${visibleCount}/${totalCount}`
          : `${totalCount}`;
      }
    };

    searchInput?.addEventListener("input", () => {
      applyModuleFilters();
    });

    filterActiveButton?.addEventListener("click", () => {
      activeOnlyFilterEnabled = !activeOnlyFilterEnabled;
      updateActiveFilterButtonState();
      applyModuleFilters();
    });

    selectActiveButton?.addEventListener("click", () => {
      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        const isRequired = row.dataset.required === "true";
        const isActive = row.dataset.active === "true";
        if (checkbox) checkbox.checked = isRequired || isActive;
      }
      updateSelectionState();
    });

    clearSelectionButton?.addEventListener("click", () => {
      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        const isRequired = row.dataset.required === "true";
        if (checkbox) checkbox.checked = isRequired;
      }
      updateSelectionState();
    });

    revertPresetButton?.addEventListener("click", () => {
      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        if (!checkbox) continue;
        const isRequired = row.dataset.required === "true";
        checkbox.checked = isRequired || baselineSelectionSet.has(checkbox.value);
      }
      updateSelectionState();
    });

    html[0].addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== "baselineModulesSelected") return;
      updateSelectionState();
    });

    applyButton?.addEventListener("click", async () => {
      await this._onApplyBaseline();
    });

    presetSelector?.addEventListener("change", async (event) => {
      const presetId = event.target.value;
      await game.settings.set(MODULE_ID, "activeBaselinePresetId", presetId);
      await this.render(true);
    });

    presetManageBtn?.addEventListener("click", async () => {
      const openPresetManagementDialog = window.openPresetManagementDialog;
      await openPresetManagementDialog();
    });

    updateActiveFilterButtonState();
    applyModuleFilters();
    updateSelectionState();
  }

  async _onApplyBaseline() {
    const presetApi = window.swadeFwkPresetApi;
    const mergeWithRequiredModuleIds = window.mergeWithRequiredModuleIds;
    const promptForDependencyResolution = window.promptForDependencyResolution;
    const resolveMissingDependencies = window.resolveMissingDependencies;

    const activePreset = presetApi.getActivePresetMeta();
    const apply = await Dialog.confirm({
      title: "Apply Preset to World",
      content: `<p>This will apply <strong>${activePreset.name}</strong> to this world by enabling installed modules from the preset. Uninstalled modules are skipped.</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    if (!apply) return;

    const configuredIds = mergeWithRequiredModuleIds(presetApi.getActivePresetModuleIds());
    const configuredBeforeDependencyResolution = new Set(configuredIds);
    let autoIncludedDependencies = [];

    const currentModuleConfig = foundry.utils.deepClone(
      game.settings.get("core", "moduleConfiguration") ?? {}
    );

    // Check for missing dependencies
    const missingDeps = resolveMissingDependencies(configuredIds, currentModuleConfig);
    
    if (missingDeps.length > 0) {
      const resolution = await promptForDependencyResolution(configuredIds, missingDeps);
      if (!resolution.resolved) {
        ui.notifications?.info("SWADE Fantasy World Kit: apply cancelled.");
        return;
      }
      // Update the list of modules to enable with dependencies
      const uniqueIds = [...new Set([...resolution.modulesToEnable])];
      autoIncludedDependencies = uniqueIds.filter((id) => !configuredBeforeDependencyResolution.has(id));
      configuredIds.length = 0;
      configuredIds.push(...uniqueIds);
    }

    const missing = [];
    const alreadyEnabled = [];
    const enabledNow = [];

    const moduleConfiguration = foundry.utils.deepClone(currentModuleConfig);

    for (const id of configuredIds) {
      const module = game.modules.get(id);
      if (!module) {
        missing.push(id);
        continue;
      }

      if (module.active) {
        alreadyEnabled.push(id);
        continue;
      }

      moduleConfiguration[id] = true;
      enabledNow.push(id);
    }

    if (enabledNow.length > 0) {
      await game.settings.set("core", "moduleConfiguration", moduleConfiguration);
    }

    await game.settings.set(MODULE_ID, "appliedBaselinePresetId", activePreset.id);

    const summary = [
      `Enabled now: ${enabledNow.length}`,
      `Already enabled: ${alreadyEnabled.length}`,
      `Missing: ${missing.length}`,
      `Auto-included deps: ${autoIncludedDependencies.length}`
    ].join(" | ");

    ui.notifications?.info(`SWADE Fantasy World Kit: applied preset "${activePreset.name}". ${summary}`);
    if (missing.length > 0) {
      ui.notifications?.warn(`SWADE Fantasy World Kit: ${missing.length} preset module(s) are not installed and were skipped.`);
      console.warn("[SWADE Fantasy World Kit] Missing preset modules:\n" + missing.join("\n"));
    }

    // Reload the world if any new modules were enabled
    if (enabledNow.length > 0) {
      ui.notifications?.info("Reloading world to activate modules...");
      localStorage.setItem("swade-fwk-reopen-baseline", "1");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      await this.render(true);
    }
  }

  async _updateObject(_event, formData) {
    const presetApi = window.swadeFwkPresetApi;
    const collectAllDependencies = window.collectAllDependencies;
    const mergeWithRequiredModuleIds = window.mergeWithRequiredModuleIds;
    const promptForDependencyResolution = window.promptForDependencyResolution;
    const setActivePresetModuleIds = window.setActivePresetModuleIds;
    const updateTitleCache = window.updateTitleCache;

    const values = formData.baselineModulesSelected;
    const selected = Array.isArray(values) ? values : (values ? [values] : []);
    const deduped = [...new Set(selected.map((entry) => String(entry).trim()).filter(Boolean))];

    // Check if any selected modules have installed dependencies not also selected
    const selectedSet = new Set(deduped);
    const allDeps = collectAllDependencies(deduped);
    const missingDeps = [...allDeps].filter((depId) => {
      return game.modules.has(depId) && !selectedSet.has(depId);
    });

    let finalIds = deduped;
    if (missingDeps.length > 0) {
      const resolution = await promptForDependencyResolution(deduped, missingDeps);
      if (!resolution.resolved) return;
      finalIds = resolution.modulesToEnable;
    }

    const normalizedIds = mergeWithRequiredModuleIds(finalIds);
    await setActivePresetModuleIds(normalizedIds);
    await updateTitleCache("baselineModuleTitles", normalizedIds);
    await this.render(true);
  }
}
