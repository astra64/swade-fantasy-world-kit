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
      })
      .sort((a, b) => {
        const aStatusOrder = !a.installed ? 0 : a.active ? 2 : 1;
        const bStatusOrder = !b.installed ? 0 : b.active ? 2 : 1;
        if (aStatusOrder !== bStatusOrder) return aStatusOrder - bStatusOrder;
        return (a.title ?? a.id).localeCompare(b.title ?? b.id);
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
    const revertButton = html[0].querySelector("[data-revert-preset]");
    const searchInput = html[0].querySelector("[data-module-search]");
    const moduleRows = [...html[0].querySelectorAll("[data-module-row]")];
    const selectActiveButton = html[0].querySelector("[data-module-select-active]");
    const filterActiveButton = html[0].querySelector("[data-module-filter-active]");
    const visibleCountLabel = html[0].querySelector("[data-module-visible-count]");
    const clearSelectionButton = html[0].querySelector("[data-module-clear-selection]");
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
      if (revertButton) revertButton.disabled = !hasUnsavedChanges;
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

    revertButton?.addEventListener("click", () => {
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
    const activePreset = presetApi.getActivePresetMeta();

    // Show apply diff dialog
    const diff = this._calculateApplyDiff();
    const confirmed = await this._showApplyDiff(activePreset, diff);
    if (!confirmed) {
      ui.notifications?.info("SWADE Fantasy World Kit: apply cancelled.");
      return;
    }

    // Perform the actual apply
    await this._performApply();
  }

  async _performApply() {
    const presetApi = window.swadeFwkPresetApi;
    const mergeWithRequiredModuleIds = window.mergeWithRequiredModuleIds;
    const promptForDependencyResolution = window.promptForDependencyResolution;
    const resolveMissingDependencies = window.resolveMissingDependencies;

    const activePreset = presetApi.getActivePresetMeta();
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
      const uniqueIds = [...new Set([...resolution.modulesToEnable])];
      autoIncludedDependencies = uniqueIds.filter((id) => !configuredBeforeDependencyResolution.has(id));
      configuredIds.length = 0;
      configuredIds.push(...uniqueIds);
    }

    const missing = [];
    const alreadyEnabled = [];
    const enabledNow = [];
    const disabledNow = [];

    const moduleConfiguration = foundry.utils.deepClone(currentModuleConfig);
    const desiredIdSet = new Set(configuredIds);

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

    // Authoritative apply: disable any currently enabled module not in desired preset.
    for (const module of game.modules.values()) {
      const id = module.id;
      if (id === MODULE_ID) continue;
      if (desiredIdSet.has(id)) continue;

      const currentlyEnabled = module.active || moduleConfiguration[id] === true;
      if (!currentlyEnabled) continue;

      moduleConfiguration[id] = false;
      disabledNow.push(id);
    }

    if (enabledNow.length > 0 || disabledNow.length > 0) {
      await game.settings.set("core", "moduleConfiguration", moduleConfiguration);
    }

    await game.settings.set(MODULE_ID, "appliedBaselinePresetId", activePreset.id);
    this._showApplyResult(enabledNow, disabledNow, alreadyEnabled, missing, autoIncludedDependencies);

    // Reload the world if module activation state changed.
    if (enabledNow.length > 0 || disabledNow.length > 0) {
      ui.notifications?.info("Reloading world to activate modules...");
      localStorage.setItem("swade-fwk-reopen-baseline", "1");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      await this.render(true);
    }
  }

  _showApplyResult(enabledNow, disabledNow, alreadyEnabled, missing, autoIncludedDependencies) {
    let content = `<div class="scfc-result-dialog">`;
    content += `<p><strong>Preset applied.</strong></p>`;

    if (enabledNow.length > 0) {
      content += `<div class="scfc-result-section">`;
      content += `<strong style="color: #7a9928;">Enabled in World (${enabledNow.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">`;
      for (const id of enabledNow) {
        const mod = game.modules.get(id);
        content += `<li>${mod?.title ?? id}</li>`;
      }
      content += `</ul></div>`;
    }

    if (disabledNow.length > 0) {
      content += `<div class="scfc-result-section">`;
      content += `<strong style="color: #c48b2b;">Disabled in World (${disabledNow.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">`;
      for (const id of disabledNow) {
        const mod = game.modules.get(id);
        content += `<li>${mod?.title ?? id}</li>`;
      }
      content += `</ul></div>`;
    }

    if (alreadyEnabled.length > 0) {
      content += `<div class="scfc-result-section">`;
      content += `<strong style="opacity: 0.7;">Already Enabled (${alreadyEnabled.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; opacity: 0.7;">`;
      for (const id of alreadyEnabled) {
        const mod = game.modules.get(id);
        content += `<li>${mod?.title ?? id}</li>`;
      }
      content += `</ul></div>`;
    }

    if (autoIncludedDependencies.length > 0) {
      content += `<div class="scfc-result-section">`;
      content += `<strong>Auto-Included Dependencies (${autoIncludedDependencies.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.95em;">`;
      for (const id of autoIncludedDependencies) {
        const mod = game.modules.get(id);
        content += `<li>${mod?.title ?? id}</li>`;
      }
      content += `</ul></div>`;
    }

    if (missing.length > 0) {
      content += `<div class="scfc-result-section">`;
      content += `<strong>Skipped - Not Installed (${missing.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; opacity: 0.8;">`;
      for (const id of missing) {
        content += `<li><code>${id}</code></li>`;
      }
      content += `</ul></div>`;
    }

    content += `</div>`;

    Dialog.confirm({
      title: "Preset Applied",
      content,
      yes: () => true,
      defaultYes: true
    });
  }

  _calculateSaveDiff(newIds) {
    const presetApi = window.swadeFwkPresetApi;
    const currentIds = presetApi.getActivePresetModuleIds();
    const currentSet = new Set(currentIds);
    const newSet = new Set(newIds);

    const willAdd = [];
    const willRemove = [];
    const alreadyIn = [];

    for (const id of newSet) {
      const mod = game.modules.get(id);
      const title = mod?.title ?? id;

      // Skip entries with null/undefined/empty id or string "null"
      if (!id || !String(id).trim() || String(id) === "null") continue;

      if (currentSet.has(id)) {
        alreadyIn.push({ id, title });
      } else {
        willAdd.push({ id, title });
      }
    }

    for (const id of currentSet) {
      if (!newSet.has(id)) {
        const mod = game.modules.get(id);
        const title = mod?.title ?? id;
        willRemove.push({ id, title });
      }
    }

    console.log("[SWADE FWK] _calculateSaveDiff:", { willAdd, willRemove, alreadyIn });
    return { willAdd, willRemove, alreadyIn };
  }

  async _showSaveDiff(preset, diff) {
    let content = `<div class="scfc-diff-dialog">`;
    content += `<p><strong>Preset:</strong> ${preset.name}</p>`;
    content += `<p>Review your changes before saving to this preset.</p>`;

    if (diff.willAdd.length > 0) {
      content += `<div class="scfc-diff-section">`;
      content += `<strong style="color: #7a9928;">Will Add to Preset (${diff.willAdd.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">`;
      for (const mod of diff.willAdd) {
        content += `<li>${mod.title}</li>`;
      }
      content += `</ul></div>`;
    }

    if (diff.willRemove.length > 0) {
      content += `<div class="scfc-diff-section">`;
      content += `<strong style="color: #c48b2b;">Will Remove from Preset (${diff.willRemove.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">`;
      for (const mod of diff.willRemove) {
        content += `<li>${mod.title}</li>`;
      }
      content += `</ul></div>`;
    }

    if (diff.alreadyIn.length > 0) {
      content += `<div class="scfc-diff-section">`;
      content += `<strong style="opacity: 0.7;">Already in Preset (${diff.alreadyIn.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; opacity: 0.7;">`;
      for (const mod of diff.alreadyIn) {
        content += `<li>${mod.title}</li>`;
      }
      content += `</ul></div>`;
    }

    content += `</div>`;

    return new Promise((resolve) => {
      const d = new Dialog({
        title: "Save Preset",
        content,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Save",
            callback: () => {
              console.log("[SWADE FWK] Dialog: Save clicked");
              resolve("save");
            }
          },
          saveApply: {
            icon: '<i class="fas fa-rocket"></i>',
            label: "Save & Apply",
            callback: () => {
              console.log("[SWADE FWK] Dialog: Save & Apply clicked");
              resolve("save-and-apply");
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => {
              console.log("[SWADE FWK] Dialog: Cancel clicked");
              resolve("cancel");
            }
          }
        },
        default: "save"
      });
      d.render(true);
    });
  }

  _calculateApplyDiff() {
    const presetApi = window.swadeFwkPresetApi;
    const mergeWithRequiredModuleIds = window.mergeWithRequiredModuleIds;

    const configuredIds = mergeWithRequiredModuleIds(presetApi.getActivePresetModuleIds());
    const currentModuleConfig = foundry.utils.deepClone(
      game.settings.get("core", "moduleConfiguration") ?? {}
    );

    const missing = [];
    const alreadyEnabled = [];
    const willEnable = [];
    const willDisable = [];

    const desiredIdSet = new Set(configuredIds);

    for (const id of configuredIds) {
      const module = game.modules.get(id);
      if (!module) {
        missing.push({ id, title: null });
        continue;
      }

      if (module.active) {
        alreadyEnabled.push({ id, title: module.title ?? id });
        continue;
      }

      willEnable.push({ id, title: module.title ?? id });
    }

    for (const module of game.modules.values()) {
      const id = module.id;
      if (id === MODULE_ID) continue;
      if (desiredIdSet.has(id)) continue;

      const currentlyEnabled = module.active || currentModuleConfig[id] === true;
      if (!currentlyEnabled) continue;

      willDisable.push({ id, title: module.title ?? id });
    }

    return {
      willEnable,
      willDisable,
      alreadyEnabled,
      missing
    };
  }

  async _showApplyDiff(preset, diff) {
    let content = `<div class="scfc-diff-dialog">`;
    content += `<p><strong>Preset:</strong> ${preset.name}</p>`;
    content += `<p>Review what will change when this preset is applied to the world.</p>`;

    if (diff.willEnable.length > 0) {
      content += `<div class="scfc-diff-section">`;
      content += `<strong style="color: #7a9928;">Will Enable in World (${diff.willEnable.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">`;
      for (const mod of diff.willEnable) {
        content += `<li>${mod.title}</li>`;
      }
      content += `</ul></div>`;
    }

    if (diff.willDisable.length > 0) {
      content += `<div class="scfc-diff-section">`;
      content += `<strong style="color: #c48b2b;">Will Disable in World (${diff.willDisable.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">`;
      for (const mod of diff.willDisable) {
        content += `<li>${mod.title}</li>`;
      }
      content += `</ul></div>`;
    }

    if (diff.alreadyEnabled.length > 0) {
      content += `<div class="scfc-diff-section">`;
      content += `<strong style="opacity: 0.7;">Already Enabled in World (${diff.alreadyEnabled.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; opacity: 0.7;">`;
      for (const mod of diff.alreadyEnabled) {
        content += `<li>${mod.title}</li>`;
      }
      content += `</ul></div>`;
    }

    if (diff.missing.length > 0) {
      content += `<div class="scfc-diff-section">`;
      content += `<strong style="color: #cc3333;">Missing / Not Installed (${diff.missing.length}):</strong>`;
      content += `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; opacity: 0.8;">`;
      for (const mod of diff.missing) {
        content += `<li><code>${mod.id}</code></li>`;
      }
      content += `</ul></div>`;
    }

    content += `</div>`;

    return Dialog.confirm({
      title: "Apply Preset to World",
      content,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
  }

  async _updateObject(_event, formData) {
    const presetApi = window.swadeFwkPresetApi;
    const collectAllDependencies = window.collectAllDependencies;
    const mergeWithRequiredModuleIds = window.mergeWithRequiredModuleIds;
    const promptForDependencyResolution = window.promptForDependencyResolution;
    const setActivePresetModuleIds = window.setActivePresetModuleIds;
    const updateTitleCache = window.updateTitleCache;

    console.log("[SWADE FWK] _updateObject called", { formData });

    const values = formData.baselineModulesSelected;
    const selected = Array.isArray(values) ? values : (values ? [values] : []);
    const deduped = [...new Set(selected.map((entry) => String(entry).trim()).filter((id) => id && id !== "null" && id.length > 0))];

    console.log("[SWADE FWK] Selected modules after dedup:", deduped);

    // Check if any selected modules have installed dependencies not also selected
    const selectedSet = new Set(deduped);
    const allDeps = collectAllDependencies(deduped);
    const missingDeps = [...allDeps].filter((depId) => {
      return game.modules.has(depId) && !selectedSet.has(depId);
    });

    console.log("[SWADE FWK] Missing dependencies:", missingDeps);

    let finalIds = deduped;
    if (missingDeps.length > 0) {
      const resolution = await promptForDependencyResolution(deduped, missingDeps);
      if (!resolution.resolved) {
        console.log("[SWADE FWK] Dependency resolution cancelled");
        return;
      }
      finalIds = resolution.modulesToEnable;
      console.log("[SWADE FWK] Final IDs after dependency resolution:", finalIds);
    }

    const normalizedIds = mergeWithRequiredModuleIds(finalIds);
    console.log("[SWADE FWK] Normalized IDs (with required):", normalizedIds);

    const presetApi_local = window.swadeFwkPresetApi;
    const activePreset = presetApi_local.getActivePresetMeta();

    // Show save diff dialog
    const preview = this._calculateSaveDiff(normalizedIds);
    console.log("[SWADE FWK] About to show save diff dialog");

    const action = await this._showSaveDiff(activePreset, preview);
    console.log("[SWADE FWK] Save diff dialog action:", action);

    if (action === "save") {
      console.log("[SWADE FWK] Saving preset...");
      await setActivePresetModuleIds(normalizedIds);
      await updateTitleCache("baselineModuleTitles", normalizedIds);
      console.log("[SWADE FWK] Preset saved, re-rendering...");
      await this.render(true);
    } else if (action === "save-and-apply") {
      console.log("[SWADE FWK] Save & Apply selected");
      // Save first
      await setActivePresetModuleIds(normalizedIds);
      await updateTitleCache("baselineModuleTitles", normalizedIds);
      console.log("[SWADE FWK] Preset saved, now applying...");
      // Then apply
      await this._performApply();
    } else {
      console.log("[SWADE FWK] Save cancelled");
    }
  }
}
