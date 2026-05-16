import {
  createPresetApi,
  parseModuleIdList,
  parseTitlesMap,
  parseVisiblePackList
} from "./lib/preset-utils.js";
import { createDependencyApi } from "./lib/dependencies.js";
import { BaselineModulesManager } from "./apps/BaselineModulesManager.js";
import { ExtraVisiblePacksSelector } from "./apps/ExtraVisiblePacksSelector.js";
import { setupSettings } from "./settings.js";
import { setupMigrations } from "./migrations.js";
import { setupUI } from "./ui.js";

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

const {
  getPresetMap,
  getActivePresetId,
  getAppliedPresetId,
  getActivePresetMeta,
  getAppliedPresetMeta,
  sanitizeAppliedPresetId,
  getActivePresetModuleIds,
  setActivePresetModuleIds,
  parsePresetMap,
  suggestUniquePresetName
} = createPresetApi({
  moduleId: MODULE_ID,
  defaultPresetId: DEFAULT_PRESET_ID
});

const {
  getRequiredModuleIds,
  getModuleDependencies,
  collectAllDependencies,
  resolveMissingDependencies,
  mergeWithRequiredModuleIds
} = createDependencyApi({ moduleId: MODULE_ID });

// === Utility Functions (defined early for use in setup calls) ===
function rerenderCompendiumDirectory() {
  ui.compendium?.render(true);
}

function buildSelectionSignature(ids) {
  return [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .join("\n");
}

// Setup migrations (returns migration functions bound to helpers)
const {
  migrateLegacyModuleSettings,
  sanitizeBaselineModules,
  sanitizeNamedPresets,
  findModulesWithInvalidDependencyMetadata
} = setupMigrations({
  parseModuleIdList,
  buildSelectionSignature,
  parsePresetMap
});

// Setup UI (returns UI functions bound to helpers)
const {
  styleAndFilterCompendiumRows,
  injectSettingsQuickAccessButton,
  tryInjectSettingsQuickAccessButton,
  applyPlayerPackAccessPatch,
  syncQuickInsertPackRestrictions
} = setupUI({
  parseVisiblePackList,
  openBaselineManager: () => {
    const existing = Object.values(ui.windows ?? {}).find((app) => app instanceof BaselineModulesManager);
    if (existing) {
      existing.render(false, { focus: true });
      existing.bringToTop?.();
      return existing;
    }
    return new BaselineModulesManager().render(true);
  }
});

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

async function rerenderBaselineManagers() {
  const windows = Object.values(ui.windows ?? {});
  const managers = windows.filter((app) => app instanceof BaselineModulesManager);
  for (const manager of managers) {
    await manager.render(true);
  }
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

function getGlobalBaselineModuleIds() {
  return mergeWithRequiredModuleIds(
    parseModuleIdList(game.settings.get(MODULE_ID, "globalBaselineModules"))
  );
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

  // Setup all game settings
  setupSettings({
    BaselineModulesManager,
    ExtraVisiblePacksSelector,
    handleVisibilitySettingsChanged
  });

  // Expose APIs and functions to window for app classes
  window.swadeFwkPresetApi = {
    getPresetMap,
    getActivePresetId,
    getAppliedPresetId,
    getActivePresetMeta,
    getAppliedPresetMeta,
    sanitizeAppliedPresetId,
    getActivePresetModuleIds,
    setActivePresetModuleIds,
    parsePresetMap,
    suggestUniquePresetName
  };

  window.swadeFwkDependencyApi = {
    getRequiredModuleIds,
    getModuleDependencies,
    collectAllDependencies,
    resolveMissingDependencies,
    mergeWithRequiredModuleIds
  };

  // Expose utility functions
  window.getRequiredModuleIds = getRequiredModuleIds;
  window.getModuleDependencies = getModuleDependencies;
  window.buildSelectionSignature = buildSelectionSignature;
  window.parseTitlesMap = parseTitlesMap;
  window.mergeWithRequiredModuleIds = mergeWithRequiredModuleIds;
  window.collectAllDependencies = collectAllDependencies;
  window.promptForDependencyResolution = promptForDependencyResolution;
  window.resolveMissingDependencies = resolveMissingDependencies;
  window.setActivePresetModuleIds = setActivePresetModuleIds;
  window.updateTitleCache = updateTitleCache;
  window.openPresetManagementDialog = openPresetManagementDialog;
  window.parseVisiblePackList = parseVisiblePackList;
  window.handleVisibilitySettingsChanged = handleVisibilitySettingsChanged;

  // Expose app classes
  window.BaselineModulesManager = BaselineModulesManager;
  window.ExtraVisiblePacksSelector = ExtraVisiblePacksSelector;
});

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
