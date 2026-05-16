const MODULE_ID = "swade-fantasy-world-kit";
// TODO(next version): Remove legacy ID support after one release cycle.
const LEGACY_MODULE_ID = "swade-consolidated-fantasy-compendiums";
const MIGRATABLE_WORLD_SETTING_KEYS = [
  "curatedMode",
  "gmSeesAllPacks",
  "extraVisiblePacks",
  "baselineModules"
];
const MIGRATABLE_CLIENT_SETTING_KEYS = ["globalBaselineModules"];
const DEFAULT_PRESET_ID = "default";

function rerenderCompendiumDirectory() {
  ui.compendium?.render(true);
}

function openBaselineManager() {
  const existing = Object.values(ui.windows ?? {}).find((app) => app instanceof BaselineModulesManager);
  if (existing) {
    existing.render(false, { focus: true });
    existing.bringToTop?.();
    return existing;
  }

  return new BaselineModulesManager().render(true);
}

async function handleVisibilitySettingsChanged() {
  rerenderCompendiumDirectory();
  await syncQuickInsertPackRestrictions();
}

const COMPANION_BANNER_CACHE = { urls: null };

function getCompanionBannerUrl() {
  if (COMPANION_BANNER_CACHE.urls) return COMPANION_BANNER_CACHE.urls;

  const row = document.querySelector("[data-pack='swade-fantasy-companion.swade-fc-deck']");
  const src = row?.querySelector("img.compendium-banner")?.getAttribute("src") ?? null;

  const urls = src ? [src] : [];
  if (urls.length > 0) COMPANION_BANNER_CACHE.urls = urls;
  return urls;
}

function buildSelectionSignature(ids) {
  return [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .join("\n");
}

function styleAndFilterCompendiumRows(htmlRoot) {
  const root = htmlRoot?.[0] ?? htmlRoot;
  if (!root?.querySelectorAll) return;

  const alternateBanners = getCompanionBannerUrl();
  let ownedPackIndex = 0;

  const rowNodes = root.querySelectorAll("[data-pack], [data-entry-id]");
  for (const element of rowNodes) {
    const packId = element.dataset.pack ?? element.dataset.entryId ?? "";
    if (!packId.includes(".")) continue;

    const packageId = packId.split(".")[0] ?? "";
    const row = element.closest(".directory-item, li") ?? element;
    const isSwadePack = packageId === MODULE_ID;

    element.classList.remove("scfc-hidden-pack");
    element.classList.toggle("scfc-swade-pack", isSwadePack);
    row.classList.toggle("scfc-swade-pack", isSwadePack);



    const bannerElement = row.querySelector("img.compendium-banner") ?? element.querySelector?.("img.compendium-banner");
    if (bannerElement) {
      if (!bannerElement.dataset.scfcOriginalSrc) {
        bannerElement.dataset.scfcOriginalSrc = bannerElement.getAttribute("src") ?? "";
      }

      if (isSwadePack && alternateBanners.length > 0) {
        bannerElement.setAttribute("src", alternateBanners[ownedPackIndex % alternateBanners.length]);
        ownedPackIndex++;
      } else if (!isSwadePack) {
        const originalSrc = bannerElement.dataset.scfcOriginalSrc;
        if (originalSrc) bannerElement.setAttribute("src", originalSrc);
      }
    }

    if (isPackAllowedForUser(packId, game.user)) continue;

    element.classList.add("scfc-hidden-pack");
  }
}

function injectSettingsQuickAccessButton(htmlRoot) {
  if (!game.user?.isGM) return;
  if (!game.settings.get(MODULE_ID, "gmQuickAccessSidebarButton")) return;

  const root = htmlRoot?.[0] ?? htmlRoot ?? document;
  if (!root?.querySelector) return;

  if (document.querySelector("[data-scfc-quick-access-section]")) return;

  const candidateContainers = [
    "#settings-buttons",
    ".tab[data-tab='settings'] #settings-buttons",
    "#sidebar .tab[data-tab='settings'] #settings-buttons",
    "#sidebar .tab[data-tab='settings'] .settings-list",
    "#sidebar #settings .settings-list",
    "#sidebar #settings",
    "#settings"
  ];

  let settingsButtons = null;
  for (const selector of candidateContainers) {
    settingsButtons = root.querySelector(selector) ?? document.querySelector(selector);
    if (settingsButtons) break;
  }
  if (!settingsButtons) return;

  const section = document.createElement("section");
  section.dataset.scfcQuickAccessSection = "1";
  section.className = "scfc-gm-quick-access-section";

  const title = document.createElement("h2");
  title.className = "scfc-gm-quick-access-title";
  title.textContent = "SWADE Fantasy World Kit";

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.scfcOpenBaselineManager = "1";
  button.className = "scfc-gm-quick-access";
  button.innerHTML = '<i class="fas fa-puzzle-piece"></i> Preset Modules';
  button.addEventListener("click", () => openBaselineManager());

  section.appendChild(title);
  section.appendChild(button);
  settingsButtons.appendChild(section);
}

function tryInjectSettingsQuickAccessButton() {
  injectSettingsQuickAccessButton(document);
}

class ExtraVisiblePacksSelector extends FormApplication {
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
    await handleVisibilitySettingsChanged();
  }
}

class BaselineModulesManager extends FormApplication {
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
    const requiredIds = new Set(getRequiredModuleIds());
    const selectedIds = new Set(getActivePresetModuleIds());
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
    const activePreset = getActivePresetMeta();
    const appliedPreset = getAppliedPresetMeta();
    const presetMap = getPresetMap();
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
      await openPresetManagementDialog();
    });

    updateActiveFilterButtonState();
    applyModuleFilters();
    updateSelectionState();
  }

  async _onApplyBaseline() {
    const activePreset = getActivePresetMeta();
    const apply = await Dialog.confirm({
      title: "Apply Preset to World",
      content: `<p>This will apply <strong>${activePreset.name}</strong> to this world by enabling installed modules from the preset. Uninstalled modules are skipped.</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    if (!apply) return;

    const configuredIds = mergeWithRequiredModuleIds(getActivePresetModuleIds());
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

async function rerenderBaselineManagers() {
  const windows = Object.values(ui.windows ?? {});
  const managers = windows.filter((app) => app instanceof BaselineModulesManager);
  for (const manager of managers) {
    await manager.render(true);
  }
}

function presetNameExists(name, presets, excludeId = null) {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return false;

  for (const [id, preset] of Object.entries(presets)) {
    if (excludeId && id === excludeId) continue;
    const presetName = String(preset?.name ?? id).trim().toLowerCase();
    if (presetName === normalized) return true;
  }

  return false;
}

function suggestUniquePresetName(baseName, presets, excludeId = null) {
  const base = String(baseName ?? "").trim() || "Preset";
  if (!presetNameExists(base, presets, excludeId)) return base;

  let i = 2;
  while (presetNameExists(`${base} ${i}`, presets, excludeId)) {
    i += 1;
  }

  return `${base} ${i}`;
}

// Preset CRUD Helpers
async function createNewPreset() {
  const dialog = new Dialog({
    title: "Create New Preset",
    content: '<input type="text" id="presetName" placeholder="Preset name..." style="width: 100%;">',
    buttons: {
      create: {
        label: "Create",
        callback: async (html) => {
          const name = String(html.find("#presetName").val() ?? "").trim();
          if (!name) return;
          
          const presets = getPresetMap();
          const finalName = suggestUniquePresetName(name, presets);
          const newId = `preset-${Date.now()}`;
          presets[newId] = {
            name: finalName,
            moduleIds: []
          };
          
          await game.settings.set(MODULE_ID, "namedBaselinePresets", JSON.stringify(presets));
          await rerenderBaselineManagers();
          if (finalName !== name) {
            ui.notifications?.info(`Preset name already existed; created "${finalName}".`);
          } else {
            ui.notifications?.info(`Preset "${finalName}" created.`);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    }
  });
  dialog.render(true);
}

async function renamePreset(presetId) {
  const presets = getPresetMap();
  const preset = presets[presetId];
  if (!preset) return;

  const dialog = new Dialog({
    title: "Rename Preset",
    content: `<input type="text" id="presetName" value="${preset.name ?? ""}" style="width: 100%;">`,
    buttons: {
      rename: {
        label: "Rename",
        callback: async (html) => {
          const name = String(html.find("#presetName").val() ?? "").trim();
          if (!name) return;
          
          const finalName = suggestUniquePresetName(name, presets, presetId);
          preset.name = finalName;
          await game.settings.set(MODULE_ID, "namedBaselinePresets", JSON.stringify(presets));
          await rerenderBaselineManagers();
          if (finalName !== name) {
            ui.notifications?.info(`Preset name already existed; renamed to "${finalName}".`);
          } else {
            ui.notifications?.info(`Preset renamed to "${finalName}".`);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    }
  });
  dialog.render(true);
}

async function duplicatePreset(presetId) {
  const presets = getPresetMap();
  const preset = presets[presetId];
  if (!preset) return;

  const newId = `preset-${Date.now()}`;
  const requestedName = `${preset.name ?? presetId} (copy)`;
  const newName = suggestUniquePresetName(requestedName, presets);
  
  presets[newId] = {
    name: newName,
    moduleIds: [...(preset.moduleIds ?? [])]
  };
  
  await game.settings.set(MODULE_ID, "namedBaselinePresets", JSON.stringify(presets));
  await rerenderBaselineManagers();
  ui.notifications?.info(`Preset duplicated: "${newName}".`);
}

async function deletePreset(presetId) {
  const presets = getPresetMap();
  const activePresetId = getActivePresetId();
  const appliedPresetId = getAppliedPresetId();
  const isActivePreset = activePresetId === presetId;
  
  // Don't delete the default preset
  if (presetId === DEFAULT_PRESET_ID) {
    ui.notifications?.warn("Cannot delete the default preset.");
    return;
  }
  
  const confirmed = await Dialog.confirm({
    title: "Delete Preset",
    content: isActivePreset
      ? `<p>Delete preset "${presets[presetId]?.name ?? presetId}"? This cannot be undone.</p><p><strong>This preset is currently active.</strong> Active preset will switch to "Default" after deletion.</p>`
      : `<p>Delete preset "${presets[presetId]?.name ?? presetId}"? This cannot be undone.</p>`,
    yes: () => true,
    no: () => false
  });
  
  if (!confirmed) return;
  
  delete presets[presetId];
  await game.settings.set(MODULE_ID, "namedBaselinePresets", JSON.stringify(presets));
  
  // If we just deleted the active preset, switch to default
  if (activePresetId === presetId) {
    await game.settings.set(MODULE_ID, "activeBaselinePresetId", DEFAULT_PRESET_ID);
  }

  if (appliedPresetId === presetId) {
    await game.settings.set(MODULE_ID, "appliedBaselinePresetId", DEFAULT_PRESET_ID);
  }
  
  await rerenderBaselineManagers();
  ui.notifications?.info("Preset deleted.");
}

async function openPresetManagementDialog() {
  const presets = getPresetMap();
  const activePresetId = getActivePresetId();
  const presetList = Object.entries(presets)
    .map(([id, preset]) => `<option value="${id}" ${id === activePresetId ? "selected" : ""}>${preset.name ?? id}</option>`)
    .join("");

  const content = `
    <div style="display: grid; gap: 0.8rem;">
      <div style="display: grid; gap: 0.3rem;">
        <label for="presetSelect" style="font-weight: 600; font-size: 12px;">Select a preset:</label>
        <select id="presetSelect" style="width: 100%;">
          ${presetList}
        </select>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem;">
        <button type="button" id="presetRenameBtn" style="cursor: pointer;">Rename</button>
        <button type="button" id="presetDuplicateBtn" style="cursor: pointer;">Duplicate</button>
        <button type="button" id="presetDeleteBtn" style="cursor: pointer;">Delete</button>
        <button type="button" id="presetCreateBtn" style="cursor: pointer;">Create New</button>
      </div>
    </div>
  `;

  const dialog = new Dialog({
    title: "Manage Presets",
    content,
    buttons: {
      close: {
        label: "Close"
      }
    },
    default: "close",
    render: (html) => {
      const root = html[0];
      const presetSelect = root?.querySelector("#presetSelect");
      const renameBtn = root?.querySelector("#presetRenameBtn");
      const duplicateBtn = root?.querySelector("#presetDuplicateBtn");
      const deleteBtn = root?.querySelector("#presetDeleteBtn");
      const createBtn = root?.querySelector("#presetCreateBtn");

      const updateDeleteButtonState = () => {
        if (!presetSelect || !deleteBtn) return;
        const isDefaultSelected = presetSelect.value === DEFAULT_PRESET_ID;
        deleteBtn.disabled = isDefaultSelected;
        deleteBtn.title = isDefaultSelected
          ? "Default preset cannot be deleted."
          : "Delete selected preset";
      };

      updateDeleteButtonState();
      presetSelect?.addEventListener("change", updateDeleteButtonState);

      renameBtn?.addEventListener("click", async () => {
        const presetId = presetSelect?.value ?? DEFAULT_PRESET_ID;
        dialog.close();
        await renamePreset(presetId);
      });

      duplicateBtn?.addEventListener("click", async () => {
        const presetId = presetSelect?.value ?? DEFAULT_PRESET_ID;
        dialog.close();
        await duplicatePreset(presetId);
      });

      deleteBtn?.addEventListener("click", async () => {
        if (deleteBtn.disabled) return;
        const presetId = presetSelect?.value ?? DEFAULT_PRESET_ID;
        dialog.close();
        await deletePreset(presetId);
      });

      createBtn?.addEventListener("click", async () => {
        dialog.close();
        await createNewPreset();
      });
    }
  });

  dialog.render(true);
}

function getRequiredModuleIds() {
  const thisModule = game.modules.get(MODULE_ID);
  const requires =
    thisModule?.relationships?.requires ??
    thisModule?.metadata?.relationships?.requires ??
    [];

  return [...new Set(
    requires
      .map((entry) => entry?.id)
      .filter((id) => typeof id === "string" && id.length > 0)
  )];
}

function getModuleDependencies(moduleId) {
  const module = game.modules.get(moduleId);
  if (!module) return [];

  const requires =
    module.relationships?.requires ??
    module.metadata?.relationships?.requires ??
    [];

  return [...new Set(
    requires
      .map((entry) => entry?.id)
      .filter((id) => typeof id === "string" && id.length > 0)
  )];
}

function collectAllDependencies(moduleIds, currentModuleConfig = {}) {
  const visited = new Set(Object.keys(currentModuleConfig));
  const toVisit = [...moduleIds];
  const allDependencies = new Set();

  while (toVisit.length > 0) {
    const id = toVisit.shift();
    if (visited.has(id)) continue;
    
    visited.add(id);
    const deps = getModuleDependencies(id);
    
    for (const dep of deps) {
      allDependencies.add(dep);
      if (!visited.has(dep)) {
        toVisit.push(dep);
      }
    }
  }

  return allDependencies;
}

function resolveMissingDependencies(moduleIds, currentModuleConfig = {}) {
  const allNeededDeps = collectAllDependencies(moduleIds, currentModuleConfig);
  const missingDeps = [];

  for (const depId of allNeededDeps) {
    const depModule = game.modules.get(depId);
    
    // Skip if not installed
    if (!depModule) continue;
    
    const isActive = depModule.active ?? false;
    const isInConfig = currentModuleConfig[depId] === true;
    if (!isActive && !isInConfig) {
      missingDeps.push(depId);
    }
  }

  return missingDeps;
}

async function promptForDependencyResolution(modulesToEnable, missingDeps) {
  if (missingDeps.length === 0) return { resolved: true, modulesToEnable };

  const depsList = missingDeps
    .map((id) => {
      const module = game.modules.get(id);
      return `<li>${module?.title ?? id}</li>`;
    })
    .join("");

  const content = `
    <p>The modules you selected require the following installed dependencies to function properly:</p>
    <ul>${depsList}</ul>
    <p>Would you like to enable these dependencies automatically?</p>
  `;

  const enable = await Dialog.confirm({
    title: "Enable Module Dependencies?",
    content,
    yes: () => true,
    no: () => false,
    defaultYes: true
  });

  if (!enable) return { resolved: false };

  return {
    resolved: true,
    modulesToEnable: [...modulesToEnable, ...missingDeps]
  };
}

async function validateModuleDependencies() {
  if (!game.user?.isGM) return;

  const activeModules = [...game.modules.values()].filter((m) => m.active);
  const issues = [];

  for (const module of activeModules) {
    const dependencies = getModuleDependencies(module.id);
    const missingDeps = dependencies.filter((depId) => {
      const depModule = game.modules.get(depId);
      return !depModule?.active;
    });

    if (missingDeps.length > 0) {
      issues.push({
        moduleId: module.id,
        moduleTitle: module.title ?? module.id,
        missingDeps
      });
    }
  }

  if (issues.length === 0) return;

  const issueDetails = issues
    .map((issue) => {
      const depsList = issue.missingDeps.map((id) => {
        const dep = game.modules.get(id);
        return `<li>${dep?.title ?? id}</li>`;
      }).join("");
      return `<strong>${issue.moduleTitle}</strong><ul>${depsList}</ul>`;
    })
    .join("");

  const warningContent = `
    <p><strong>Module Dependency Issues Detected:</strong></p>
    <p>The following active modules are missing required dependencies:</p>
    <div style="max-height: 300px; overflow-y: auto;">
      ${issueDetails}
    </div>
    <p>You can use the Preset Modules manager to safely enable modules with all dependencies.</p>
  `;

  ui.notifications?.warn("SWADE Fantasy World Kit: Module dependency issues detected. Check the console for details.");
  console.warn(`[${MODULE_ID}] Module dependency issues:`, issues);

  // Show as a dialog if multiple issues
  if (issues.length > 2) {
    Dialog.information({
      title: "Module Dependency Issues",
      content: warningContent
    });
  }
}

function mergeWithRequiredModuleIds(moduleIds) {
  const merged = new Set(moduleIds);
  for (const id of getRequiredModuleIds()) merged.add(id);
  return [...merged];
}

function getGlobalBaselineModuleIds() {
  return mergeWithRequiredModuleIds(
    parseModuleIdList(game.settings.get(MODULE_ID, "globalBaselineModules"))
  );
}

function getStoredSettingValue(scope, moduleId, key) {
  const setting = game.settings.storage.get(scope)?.get(`${moduleId}.${key}`);
  return setting?.value;
}

async function migrateLegacyModuleSettings() {
  // TODO(next version): Delete this migration function and its call site in Hooks.once("ready").
  if (MODULE_ID === LEGACY_MODULE_ID) return;

  let migratedWorldCount = 0;
  let migratedClientCount = 0;

  if (game.user?.isGM) {
    const worldMigrated = game.settings.get(MODULE_ID, "legacyWorldSettingsMigrated");
    if (!worldMigrated) {
      for (const key of MIGRATABLE_WORLD_SETTING_KEYS) {
        const legacyValue = getStoredSettingValue("world", LEGACY_MODULE_ID, key);
        if (legacyValue === undefined) continue;
        await game.settings.set(MODULE_ID, key, legacyValue);
        migratedWorldCount += 1;
      }

      await game.settings.set(MODULE_ID, "legacyWorldSettingsMigrated", true);
    }
  }

  const clientMigrated = game.settings.get(MODULE_ID, "legacyClientSettingsMigrated");
  if (!clientMigrated) {
    for (const key of MIGRATABLE_CLIENT_SETTING_KEYS) {
      const legacyValue = getStoredSettingValue("client", LEGACY_MODULE_ID, key);
      if (legacyValue === undefined) continue;
      await game.settings.set(MODULE_ID, key, legacyValue);
      migratedClientCount += 1;
    }

    await game.settings.set(MODULE_ID, "legacyClientSettingsMigrated", true);
  }

  if (migratedWorldCount + migratedClientCount > 0) {
    ui.notifications?.info(
      `SWADE Fantasy World Kit migrated legacy settings (${migratedWorldCount} world, ${migratedClientCount} client).`
    );
    console.info(
      `[${MODULE_ID}] migrated legacy settings from ${LEGACY_MODULE_ID} (${migratedWorldCount} world, ${migratedClientCount} client).`
    );
  }
}

function parseVisiblePackList(rawValue) {
  if (typeof rawValue !== "string") return new Set();

  return new Set(
    rawValue
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

function parseTitlesMap(raw) {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}

function normalizeModuleIdArray(ids) {
  if (!Array.isArray(ids)) return [];

  return [...new Set(
    ids
      .map((id) => String(id ?? "").trim())
      .filter((id) => id.length > 0 && id !== "null" && id !== "undefined")
  )];
}

function parsePresetMap(raw) {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const source = parsed && typeof parsed === "object" ? parsed : {};
    const map = {};

    for (const [id, preset] of Object.entries(source)) {
      const normalizedId = String(id ?? "").trim();
      if (!normalizedId) continue;

      const name = typeof preset?.name === "string" && preset.name.trim().length > 0
        ? preset.name.trim()
        : normalizedId;
      const moduleIds = normalizeModuleIdArray(preset?.moduleIds);

      map[normalizedId] = { name, moduleIds };
    }

    // Always keep a default preset visible/selectable.
    if (!map[DEFAULT_PRESET_ID]) {
      map[DEFAULT_PRESET_ID] = { name: "Default", moduleIds: [] };
    }
    return map;
  } catch {
    return { [DEFAULT_PRESET_ID]: { name: "Default", moduleIds: [] } };
  }
}

function getPresetMap() {
  const map = parsePresetMap(game.settings.get(MODULE_ID, "namedBaselinePresets"));
  if (!map[DEFAULT_PRESET_ID]) {
    const legacyBaselineIds = parseModuleIdList(game.settings.get(MODULE_ID, "baselineModules"));
    map[DEFAULT_PRESET_ID] = {
      name: "Default",
      moduleIds: legacyBaselineIds
    };
  }
  return map;
}

function getActivePresetId() {
  return String(game.settings.get(MODULE_ID, "activeBaselinePresetId") ?? DEFAULT_PRESET_ID);
}

function getAppliedPresetId() {
  return String(game.settings.get(MODULE_ID, "appliedBaselinePresetId") ?? DEFAULT_PRESET_ID);
}

function getActivePresetMeta() {
  const presetMap = getPresetMap();
  const activePresetId = getActivePresetId();
  const preset = presetMap[activePresetId];
  const presetName = typeof preset?.name === "string" && preset.name.trim().length > 0
    ? preset.name.trim()
    : (activePresetId === DEFAULT_PRESET_ID ? "Default" : activePresetId);
  const moduleIds = normalizeModuleIdArray(preset?.moduleIds);

  return {
    id: activePresetId,
    name: presetName,
    moduleCount: moduleIds.length
  };
}

function getAppliedPresetMeta() {
  const presetMap = getPresetMap();
  const appliedPresetId = getAppliedPresetId();
  const resolvedId = presetMap[appliedPresetId] ? appliedPresetId : DEFAULT_PRESET_ID;
  const preset = presetMap[resolvedId];
  const fallbackName = resolvedId === DEFAULT_PRESET_ID ? "Default" : resolvedId;

  return {
    id: resolvedId,
    name: preset?.name ?? fallbackName
  };
}

async function sanitizeAppliedPresetId() {
  const presetMap = getPresetMap();
  const appliedPresetId = getAppliedPresetId();
  if (presetMap[appliedPresetId]) return;

  await game.settings.set(MODULE_ID, "appliedBaselinePresetId", DEFAULT_PRESET_ID);
}

function getActivePresetModuleIds() {
  const presetMap = getPresetMap();
  const activePresetId = getActivePresetId();
  const preset = presetMap[activePresetId];

  return normalizeModuleIdArray(preset?.moduleIds);
}

async function setActivePresetModuleIds(moduleIds) {
  const presetMap = getPresetMap();
  const activePresetId = getActivePresetId();
  const currentPreset = presetMap[activePresetId] ?? {
    name: activePresetId === DEFAULT_PRESET_ID ? "Default" : activePresetId,
    moduleIds: []
  };

  const normalizedIds = normalizeModuleIdArray(moduleIds);

  presetMap[activePresetId] = {
    ...currentPreset,
    moduleIds: normalizedIds
  };

  await game.settings.set(MODULE_ID, "namedBaselinePresets", JSON.stringify(presetMap));
}

async function updateTitleCache(settingKey, ids) {
  const map = parseTitlesMap(game.settings.get(MODULE_ID, settingKey));
  const idSet = new Set(ids);
  for (const id of ids) {
    const title = game.modules.get(id)?.title;
    if (title) map[id] = title;
  }
  for (const id of Object.keys(map)) {
    if (!idSet.has(id)) delete map[id];
  }
  await game.settings.set(MODULE_ID, settingKey, JSON.stringify(map));
}

function parseModuleIdList(rawValue) {
  if (typeof rawValue !== "string") return [];

  return [...new Set(
    rawValue
      .split(/[\n,]/)
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => entry.length > 0 && entry !== "null" && entry !== "undefined")
  )];
}

function isPackAllowedForUser(packId, user = game.user) {
  const curatedMode = game.settings.get(MODULE_ID, "curatedMode");
  if (!curatedMode) return true;

  const isGM = user?.isGM === true;
  const gmSeesAllPacks = game.settings.get(MODULE_ID, "gmSeesAllPacks");
  if (isGM && gmSeesAllPacks) return true;

  const modulePrefix = `${MODULE_ID}.`;
  const extraVisiblePacks = parseVisiblePackList(
    game.settings.get(MODULE_ID, "extraVisiblePacks")
  );

  return packId.startsWith(modulePrefix) || extraVisiblePacks.has(packId);
}

function applyPlayerPackAccessPatch() {
  if (game.user?.isGM) return;

  for (const pack of game.packs.values()) {
    if (pack._scfcPatchedAccess === true) continue;
    if (typeof pack.testUserPermission !== "function") continue;

    const originalTestUserPermission = pack.testUserPermission.bind(pack);

    pack.testUserPermission = function(user, permission, options) {
      const basePermission = originalTestUserPermission(user, permission, options);
      if (!basePermission) return false;

      const effectiveUser = user ?? game.user;
      return isPackAllowedForUser(this.collection, effectiveUser);
    };

    pack._scfcPatchedAccess = true;
  }
}

async function syncQuickInsertPackRestrictions() {
  if (!game.user?.isGM) return;

  const quickInsertModule = game.modules.get("quick-insert");
  if (!quickInsertModule?.active) return;

  const current = game.settings.get("quick-insert", "indexingDisabled") ?? {};
  const next = foundry.utils.deepClone(current);
  next.packs ??= {};

  const playerRestrictedRoles = [CONST.USER_ROLES.PLAYER, CONST.USER_ROLES.TRUSTED];
  const gmRole = CONST.USER_ROLES.GAMEMASTER;

  for (const pack of game.packs.values()) {
    const packId = pack.collection;
    const isAllowedForPlayers = isPackAllowedForUser(packId, {
      isGM: false,
      role: CONST.USER_ROLES.PLAYER
    });
    const isAllowedForGMs = isPackAllowedForUser(packId, {
      isGM: true,
      role: gmRole
    });

    const existingRoles = Array.isArray(next.packs[packId]) ? [...next.packs[packId]] : [];
    const roleSet = new Set(existingRoles);

    if (isAllowedForPlayers) {
      for (const role of playerRestrictedRoles) roleSet.delete(role);
    } else {
      for (const role of playerRestrictedRoles) roleSet.add(role);
    }

    if (isAllowedForGMs) {
      roleSet.delete(gmRole);
    } else {
      roleSet.add(gmRole);
    }

    const updatedRoles = [...roleSet];
    if (updatedRoles.length === 0) {
      delete next.packs[packId];
    } else {
      next.packs[packId] = updatedRoles;
    }
  }

  const changed = JSON.stringify(current) !== JSON.stringify(next);
  if (!changed) return;

  await game.settings.set("quick-insert", "indexingDisabled", next);
  ui.notifications?.info(
    "SWADE Fantasy World Kit: Quick Insert pack restrictions synced. Have players reload to refresh search results."
  );
}

Hooks.once("init", () => {
  console.log(`[${MODULE_ID}] init`);

  game.keybindings.register(MODULE_ID, "openBaselineManager", {
    name: "Open Preset Modules",
    hint: "Open the Preset Modules manager quickly.",
    editable: [{ key: "KeyB", modifiers: ["Control", "Shift"] }],
    onDown: () => {
      if (!game.user?.isGM) return false;
      openBaselineManager();
      return true;
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });

  game.settings.registerMenu(MODULE_ID, "extraVisiblePacksMenu", {
    name: "Choose Visible Packs",
    label: "Open Pack Selector",
    hint: "Pick additional external packs that players can see while Curated Mode is enabled.",
    icon: "fas fa-list-check",
    type: ExtraVisiblePacksSelector,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "baselineModulesMenu", {
    name: "Preset Modules",
    label: "Configure and Apply",
    hint: "Edit preset module selections and apply installed modules to this world.",
    icon: "fas fa-puzzle-piece",
    type: BaselineModulesManager,
    restricted: true
  });

  game.settings.register(MODULE_ID, "curatedMode", {
    name: "Curated Mode",
    hint: "Show only curated module compendiums to players, including search integrations that honor pack permissions.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: handleVisibilitySettingsChanged
  });

  game.settings.register(MODULE_ID, "gmSeesAllPacks", {
    name: "GM Sees All Packs",
    hint: "When enabled, GMs can still see non-curated packs while players are filtered.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: handleVisibilitySettingsChanged
  });

  game.settings.register(MODULE_ID, "extraVisiblePacks", {
    name: "Extra Visible Packs (Advanced)",
    hint: "Advanced manual input. Prefer the 'Choose Visible Packs' menu button above.",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: handleVisibilitySettingsChanged
  });

  game.settings.register(MODULE_ID, "baselineModules", {
    name: "Preset Modules (Advanced)",
    hint: "Advanced manual input. Prefer the 'Preset Modules' menu button above.",
    scope: "world",
    config: false,
    type: String,
    default: [
      "swade-core-rules",
      "swade-fantasy-companion",
      "game-icons-net",
      "quick-insert"
    ].join("\n")
  });

  game.settings.register(MODULE_ID, "globalBaselineModules", {
    name: "Global Preset Modules (Advanced)",
    hint: "Client-scoped profile shared by this GM across worlds on this Foundry install.",
    scope: "client",
    config: false,
    type: String,
    default: [
      "swade-core-rules",
      "swade-fantasy-companion",
      "game-icons-net",
      "quick-insert"
    ].join("\n")
  });

  game.settings.register(MODULE_ID, "baselineModuleTitles", {
    name: "Baseline Module Titles Cache",
    scope: "world",
    config: false,
    type: String,
    default: "{}"
  });

  game.settings.register(MODULE_ID, "globalBaselineModuleTitles", {
    name: "Global Baseline Module Titles Cache",
    scope: "client",
    config: false,
    type: String,
    default: "{}"
  });

  game.settings.register(MODULE_ID, "namedBaselinePresets", {
    name: "Named Baseline Presets",
    scope: "client",
    config: false,
    type: String,
    default: "{}"
  });

  game.settings.register(MODULE_ID, "activeBaselinePresetId", {
    name: "Active Baseline Preset Id",
    scope: "world",
    config: false,
    type: String,
    default: DEFAULT_PRESET_ID
  });

  game.settings.register(MODULE_ID, "appliedBaselinePresetId", {
    name: "Applied Baseline Preset Id",
    scope: "world",
    config: false,
    type: String,
    default: DEFAULT_PRESET_ID
  });

  game.settings.register(MODULE_ID, "legacyWorldSettingsMigrated", {
    // TODO(next version): Remove this temporary migration flag setting.
    name: "Legacy World Settings Migrated",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "legacyClientSettingsMigrated", {
    // TODO(next version): Remove this temporary migration flag setting.
    name: "Legacy Client Settings Migrated",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "gmQuickAccessSidebarButton", {
    name: "GM Quick Access Button",
    hint: "Show a quick-open button in the Settings sidebar for Preset Modules.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
});

/**
 * Sanitize baselineModules by removing any null/undefined/invalid entries.
 * This fixes data integrity issues from previous versions.
 */
async function sanitizeBaselineModules() {
  const raw = game.settings.get(MODULE_ID, "baselineModules");
  const cleaned = parseModuleIdList(raw);

  const rawIds = typeof raw === "string"
    ? [...new Set(raw.split(/[\n,]/).map((entry) => String(entry ?? "").trim()).filter((entry) => entry.length > 0))]
    : [];

  if (buildSelectionSignature(cleaned) !== buildSelectionSignature(rawIds)) {
    await game.settings.set(MODULE_ID, "baselineModules", cleaned.join("\n"));
    console.log(`[${MODULE_ID}] Sanitized baselineModules: ${rawIds.length} -> ${cleaned.length}`);
  }
}

async function sanitizeNamedPresets() {
  const raw = game.settings.get(MODULE_ID, "namedBaselinePresets");
  let parsedRaw = {};
  try {
    parsedRaw = JSON.parse(raw ?? "{}");
  } catch {
    parsedRaw = {};
  }

  const normalized = parsePresetMap(raw);

  if (JSON.stringify(parsedRaw) !== JSON.stringify(normalized)) {
    await game.settings.set(MODULE_ID, "namedBaselinePresets", JSON.stringify(normalized));
    console.log(`[${MODULE_ID}] Sanitized namedBaselinePresets`);
  }
}

function findModulesWithInvalidDependencyMetadata() {
  const offenders = [];

  for (const module of game.modules.values()) {
    const requires =
      module.relationships?.requires ??
      module.metadata?.relationships?.requires ??
      [];
    if (!Array.isArray(requires) || requires.length === 0) continue;

    const invalidEntries = requires.filter((entry) => {
      const id = entry?.id;
      if (typeof id !== "string") return true;
      const trimmed = id.trim();
      return trimmed.length === 0 || trimmed === "null" || trimmed === "undefined";
    });

    if (invalidEntries.length > 0) {
      offenders.push({
        id: module.id,
        title: module.title ?? module.id,
        invalidCount: invalidEntries.length
      });
    }
  }

  return offenders;
}

Hooks.once("ready", async () => {
  // TODO(next version): Remove migration call once legacy rename rollout is complete.
  await migrateLegacyModuleSettings();
  await sanitizeBaselineModules();
  await sanitizeNamedPresets();
  await sanitizeAppliedPresetId();

  const offenders = findModulesWithInvalidDependencyMetadata();
  if (offenders.length > 0) {
    const lines = offenders.map((entry) => `${entry.id} (${entry.invalidCount})`).join("\n");
    console.warn(`[${MODULE_ID}] Modules with invalid dependency metadata:\n${lines}`);
    ui.notifications?.warn(`SWADE FWK: ${offenders.length} module(s) have invalid dependency metadata. See console.`);
  }

  applyPlayerPackAccessPatch();

  if (localStorage.getItem("swade-fwk-reopen-baseline") === "1") {
    localStorage.removeItem("swade-fwk-reopen-baseline");
    openBaselineManager();
  }

  await syncQuickInsertPackRestrictions();
  await validateModuleDependencies();

  // Re-apply styling/filtering in case compendium tab is already rendered.
  styleAndFilterCompendiumRows(document.querySelector("#compendium"));

  // Fallback injection if Settings tab is already in DOM.
  tryInjectSettingsQuickAccessButton();
  setTimeout(() => tryInjectSettingsQuickAccessButton(), 250);
  setTimeout(() => tryInjectSettingsQuickAccessButton(), 1000);
});

Hooks.on("renderCompendiumDirectory", (_app, html) => {
  styleAndFilterCompendiumRows(html);
});

Hooks.on("renderSidebarTab", (app, html) => {
  if (app?.options?.id === "compendium") {
    styleAndFilterCompendiumRows(html);
    return;
  }

  if (app?.options?.id === "settings" || app?.id === "settings") {
    injectSettingsQuickAccessButton(html);
  }
});

Hooks.on("renderSettings", (_app, html) => {
  injectSettingsQuickAccessButton(html);
});

Hooks.on("renderSidebar", (_app, html) => {
  injectSettingsQuickAccessButton(html);
});
