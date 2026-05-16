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

function rerenderCompendiumDirectory() {
  ui.compendium?.render(true);
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
      title: "SWADE Fantasy World Kit: Baseline Modules",
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
    const rawList = game.settings.get(MODULE_ID, "baselineModules");
    const requiredIds = new Set(getRequiredModuleIds());
    const selectedIds = new Set(parseModuleIdList(rawList));
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
    const configured = [...selectedIds].map((id) => {
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
    const globalSelectionSignature = buildSelectionSignature(getGlobalBaselineModuleIds());

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
      globalSelectionSignature
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
    const loadGlobalButton = html[0].querySelector("[data-module-load-global]");
    const saveGlobalButton = html[0].querySelector("[data-module-save-global]");
    const applyGlobalButton = html[0].querySelector("[data-module-apply-global]");
    const baselineSaveStateLabel = html[0].querySelector("[data-baseline-save-state]");
    const globalProfileStateLabel = html[0].querySelector("[data-global-profile-state]");

    const baselineSelectionSignature = html[0].dataset.baselineSelectionSignature ?? "";
    let globalSelectionSignature = html[0].dataset.globalSelectionSignature ?? "";

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
        ? "World baseline selection: unsaved changes"
        : "World baseline selection: saved";
      baselineSaveStateLabel.classList.toggle("scfc-save-state-unsaved", hasUnsavedChanges);
      baselineSaveStateLabel.classList.toggle("scfc-save-state-saved", !hasUnsavedChanges);
    };

    const updateGlobalProfileState = () => {
      if (!globalProfileStateLabel) return;

      const matchesGlobalProfile = getCurrentSelectionSignature() === globalSelectionSignature;
      globalProfileStateLabel.textContent = matchesGlobalProfile
        ? "Global profile: matches current selection"
        : "Global profile: differs from current selection";
      globalProfileStateLabel.classList.toggle("scfc-global-state-match", matchesGlobalProfile);
      globalProfileStateLabel.classList.toggle("scfc-global-state-diff", !matchesGlobalProfile);
    };

    const updateSelectionStateIndicators = () => {
      updateBaselineSaveState();
      updateGlobalProfileState();
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
      updateSelectionStateIndicators();
    });

    clearSelectionButton?.addEventListener("click", () => {
      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        const isRequired = row.dataset.required === "true";
        if (checkbox) checkbox.checked = isRequired;
      }
      updateSelectionStateIndicators();
    });

    html[0].addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== "baselineModulesSelected") return;
      updateSelectionStateIndicators();
    });

    html[0].addEventListener("click", async (event) => {
      const btn = event.target.closest("[data-remove-configured]");
      if (!btn) return;
      const idToRemove = btn.dataset.removeConfigured;
      if (!idToRemove) return;
      const currentIds = parseModuleIdList(game.settings.get(MODULE_ID, "baselineModules"));
      const updated = currentIds.filter((id) => id !== idToRemove);
      await game.settings.set(MODULE_ID, "baselineModules", updated.join("\n"));
      await updateTitleCache("baselineModuleTitles", updated);
      await this.render(true);
    });

    loadGlobalButton?.addEventListener("click", () => {
      const globalIds = new Set(getGlobalBaselineModuleIds());

      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        if (!checkbox) continue;

        const isRequired = row.dataset.required === "true";
        checkbox.checked = isRequired || globalIds.has(checkbox.value);
      }

      updateSelectionStateIndicators();
    });

    saveGlobalButton?.addEventListener("click", async () => {
      const selectedIds = [];

      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        if (!checkbox?.checked) continue;
        selectedIds.push(checkbox.value);
      }

      // Check if any selected modules have installed dependencies that are not also selected
      const selectedSet = new Set(selectedIds);
      const allDeps = collectAllDependencies(selectedIds);
      const missingDeps = [...allDeps].filter((depId) => {
        return game.modules.has(depId) && !selectedSet.has(depId);
      });

      let finalGlobalIds = mergeWithRequiredModuleIds(selectedIds);
      if (missingDeps.length > 0) {
        const resolution = await promptForDependencyResolution(selectedIds, missingDeps);
        if (!resolution.resolved) return;

        // Also check the dependency boxes in the UI
        for (const depId of missingDeps) {
          const depRow = moduleRows.find((r) => r.querySelector("input[type=checkbox]")?.value === depId);
          const depCheckbox = depRow?.querySelector("input[type=checkbox]");
          if (depCheckbox) depCheckbox.checked = true;
        }

        finalGlobalIds = mergeWithRequiredModuleIds(resolution.modulesToEnable);
      }

      await game.settings.set(MODULE_ID, "globalBaselineModules", finalGlobalIds.join("\n"));
      await updateTitleCache("globalBaselineModuleTitles", finalGlobalIds);
      ui.notifications?.info("SWADE Fantasy World Kit global baseline profile saved.");
      globalSelectionSignature = buildSelectionSignature(finalGlobalIds);
      updateSelectionStateIndicators();
    });

    applyGlobalButton?.addEventListener("click", async () => {
      const apply = await Dialog.confirm({
        title: "Apply Global Baseline to This World",
        content: "<p>This replaces this world's baseline list with your saved global profile, then enables installed modules from that list.</p>",
        yes: () => true,
        no: () => false,
        defaultYes: true
      });
      if (!apply) return;

      const globalIds = getGlobalBaselineModuleIds();
      await game.settings.set(MODULE_ID, "baselineModules", globalIds.join("\n"));
      // Carry the global title cache over to the world title cache
      await game.settings.set(MODULE_ID, "baselineModuleTitles", game.settings.get(MODULE_ID, "globalBaselineModuleTitles"));
      await this._onApplyBaseline();
    });

    applyButton?.addEventListener("click", async () => {
      await this._onApplyBaseline();
    });

    updateActiveFilterButtonState();
    applyModuleFilters();
    updateSelectionStateIndicators();
  }

  async _onApplyBaseline() {
    const apply = await Dialog.confirm({
      title: "Apply Baseline Modules",
      content: "<p>This will enable installed modules from your baseline list for this world. Uninstalled modules are skipped.</p>",
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    if (!apply) return;

    const configuredIds = mergeWithRequiredModuleIds(
      parseModuleIdList(game.settings.get(MODULE_ID, "baselineModules"))
    );
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
        ui.notifications?.info("SWADE Fantasy World Kit baseline apply cancelled.");
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

    const summary = [
      `Enabled now: ${enabledNow.length}`,
      `Already enabled: ${alreadyEnabled.length}`,
      `Missing: ${missing.length}`,
      `Auto-included deps: ${autoIncludedDependencies.length}`
    ].join(" | ");

    ui.notifications?.info(`SWADE Fantasy World Kit baseline apply complete. ${summary}`);
    if (missing.length > 0) {
      console.warn("[SWADE Fantasy World Kit] Missing baseline modules:\n" + missing.join("\n"));
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
    const normalized = normalizedIds.join("\n");

    await game.settings.set(MODULE_ID, "baselineModules", normalized);
    await updateTitleCache("baselineModuleTitles", normalizedIds);
    await this.render(true);
  }
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
    <p>You can use the Baseline Modules manager to safely enable modules with all dependencies.</p>
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
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
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

  game.settings.registerMenu(MODULE_ID, "extraVisiblePacksMenu", {
    name: "Choose Visible Packs",
    label: "Open Pack Selector",
    hint: "Pick additional external packs that players can see while Curated Mode is enabled.",
    icon: "fas fa-list-check",
    type: ExtraVisiblePacksSelector,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "baselineModulesMenu", {
    name: "Baseline Modules",
    label: "Configure and Apply",
    hint: "Configure baseline module IDs and enable installed ones for this world.",
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
    name: "Baseline Modules (Advanced)",
    hint: "Advanced manual input. Prefer the 'Baseline Modules' menu button above.",
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
    name: "Global Baseline Modules (Advanced)",
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
});

Hooks.once("ready", async () => {
  // TODO(next version): Remove migration call once legacy rename rollout is complete.
  await migrateLegacyModuleSettings();
  applyPlayerPackAccessPatch();

  if (localStorage.getItem("swade-fwk-reopen-baseline") === "1") {
    localStorage.removeItem("swade-fwk-reopen-baseline");
    new BaselineModulesManager().render(true);
  }

  await syncQuickInsertPackRestrictions();
  await validateModuleDependencies();

  // Re-apply styling/filtering in case compendium tab is already rendered.
  styleAndFilterCompendiumRows(document.querySelector("#compendium"));
});

Hooks.on("renderCompendiumDirectory", (_app, html) => {
  styleAndFilterCompendiumRows(html);
});

Hooks.on("renderSidebarTab", (app, html) => {
  if (app?.options?.id !== "compendium") return;
  styleAndFilterCompendiumRows(html);
});
