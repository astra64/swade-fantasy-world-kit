const MODULE_ID = "swade-fantasy-world-kit";

console.log('[SWADE FWK] Module loading...');

import { createWorldSetupToolsApi } from "./world-setup-tools/lib/index.js";
import { exportPreset, importPreset } from "./world-setup-tools/lib/preset-utils.js";
import { BaselineModulesManager } from "./world-setup-tools/apps/BaselineModulesManager.js";
import { ExtraVisiblePacksSelector } from "./world-setup-tools/apps/ExtraVisiblePacksSelector.js";
import { setupSettings } from "./settings.js";
import { setupMigrations } from "./migrations.js";
import { setupUI } from "./ui.js";
import { createIconRemapper } from "./lib/icon-remapper.js";
import { pathMappings, nameMappings, fallbackIconMappings } from "./lib/icon-mappings.js";
import { setupCharacterCreationTools, CharacterManager, invalidateCompendiumCache } from "./apps/character-creation/index.js";

// Expose icon remapping utilities immediately
window.swadeFwkIconRemapper = createIconRemapper(pathMappings, nameMappings, fallbackIconMappings);
window.swadeFwkIconMappings = { pathMappings, nameMappings, fallbackIconMappings };
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

const { presetApi, dependencyApi, utilFunctions } = createWorldSetupToolsApi({
  moduleId: MODULE_ID,
  defaultPresetId: DEFAULT_PRESET_ID
});

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
} = presetApi;

// === Utility Functions (defined early for use in setup calls) ===
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

// Setup migrations (returns migration functions bound to helpers)
const {
  migrateLegacyModuleSettings,
  sanitizeBaselineModules,
  sanitizeNamedPresets,
  findModulesWithInvalidDependencyMetadata
} = setupMigrations({
  parseModuleIdList: utilFunctions.parseModuleIdList,
  buildSelectionSignature: utilFunctions.buildSelectionSignature,
  parsePresetMap
});

// Setup UI (returns UI functions bound to helpers)
const {
  styleAndFilterCompendiumRows,
  injectSettingsQuickAccessButton,
  tryInjectSettingsQuickAccessButton,
  applyPlayerPackAccessPatch,
  syncSearchModulePackRestrictions
} = setupUI({
  parseVisiblePackList: utilFunctions.parseVisiblePackList,
  openBaselineManager
});

async function handleVisibilitySettingsChanged() {
  rerenderCompendiumDirectory();
  await syncSearchModulePackRestrictions();
  invalidateCompendiumCache();
}

async function rerenderBaselineManagers() {
  const windows = Object.values(ui.windows ?? {});
  const managers = windows.filter((app) => app instanceof BaselineModulesManager);
  for (const manager of managers) {
    await manager.render(true);
  }
}

// Preset CRUD Helpers
async function createNewPreset(onComplete) {
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

          if (finalName !== name) {
            ui.notifications?.info(`Preset name already existed; created "${finalName}".`);
          } else {
            ui.notifications?.info(`Preset "${finalName}" created.`);
          }

          onComplete?.(newId);
        }
      },
      cancel: {
        label: "Cancel"
      }
    }
  });
  dialog.render(true);
}

async function renamePreset(presetId, onComplete) {
  if (presetId === DEFAULT_PRESET_ID) {
    ui.notifications?.warn("Cannot rename the default preset.");
    return;
  }

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

          if (finalName !== name) {
            ui.notifications?.info(`Preset name already existed; renamed to "${finalName}".`);
          } else {
            ui.notifications?.info(`Preset renamed to "${finalName}".`);
          }

          onComplete?.(presetId);
        }
      },
      cancel: {
        label: "Cancel"
      }
    }
  });
  dialog.render(true);
}

async function duplicatePreset(presetId, onComplete) {
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
  ui.notifications?.info(`Preset duplicated: "${newName}".`);

  onComplete?.(newId);
}

async function deletePreset(presetId, onComplete) {
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

  ui.notifications?.info("Preset deleted.");
  onComplete?.(DEFAULT_PRESET_ID);
}

async function openPresetManagementDialog() {
  const buildDialogContent = (selectedPresetId) => {
    const presets = getPresetMap();
    const presetList = Object.entries(presets)
      .map(([id, preset]) => `<option value="${id}" ${id === selectedPresetId ? "selected" : ""}>${preset.name ?? id}</option>`)
      .join("");

    return `
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
        <div style="display: grid; gap: 0.3rem; border-top: 1px solid #ddd; padding-top: 0.5rem; margin-top: 0.5rem;">
          <label style="font-weight: 600; font-size: 12px; color: #888;">Export / Import:</label>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem;">
            <button type="button" id="presetExportBtn" style="cursor: pointer;" title="Copy preset JSON to clipboard">Export</button>
            <button type="button" id="presetImportBtn" style="cursor: pointer;" title="Import preset from JSON">Import</button>
          </div>
        </div>
      </div>
    `;
  };

  const refreshDialog = (presetIdToSelect) => {
    const contentDiv = dialog.element?.[0]?.querySelector(".dialog-content");
    if (!contentDiv) return;

    contentDiv.innerHTML = buildDialogContent(presetIdToSelect);
    attachDialogListeners(presetIdToSelect);
    dialog.bringToTop?.();
  };

  const attachDialogListeners = (presetIdToSelect) => {
    const root = dialog.element?.[0]?.querySelector(".dialog-content");
    if (!root) return;

    const presetSelect = root.querySelector("#presetSelect");
    const renameBtn = root.querySelector("#presetRenameBtn");
    const duplicateBtn = root.querySelector("#presetDuplicateBtn");
    const deleteBtn = root.querySelector("#presetDeleteBtn");
    const createBtn = root.querySelector("#presetCreateBtn");
    const exportBtn = root.querySelector("#presetExportBtn");
    const importBtn = root.querySelector("#presetImportBtn");

    const updateButtonState = () => {
      if (!presetSelect) return;
      const isDefaultSelected = presetSelect.value === DEFAULT_PRESET_ID;

      // Disable rename and delete for default preset
      if (renameBtn) {
        renameBtn.disabled = isDefaultSelected;
        renameBtn.title = isDefaultSelected
          ? "Default preset cannot be renamed."
          : "Rename selected preset";
      }

      if (deleteBtn) {
        deleteBtn.disabled = isDefaultSelected;
        deleteBtn.title = isDefaultSelected
          ? "Default preset cannot be deleted."
          : "Delete selected preset";
      }
    };

    updateButtonState();
    presetSelect?.addEventListener("change", updateButtonState);

    renameBtn?.addEventListener("click", async () => {
      const presetId = presetSelect?.value ?? DEFAULT_PRESET_ID;
      await renamePreset(presetId, (updatedId) => {
        refreshDialog(updatedId);
      });
    });

    duplicateBtn?.addEventListener("click", async () => {
      const presetId = presetSelect?.value ?? DEFAULT_PRESET_ID;
      await duplicatePreset(presetId, (newId) => {
        refreshDialog(newId);
      });
    });

    deleteBtn?.addEventListener("click", async () => {
      if (deleteBtn.disabled) return;
      const presetId = presetSelect?.value ?? DEFAULT_PRESET_ID;
      await deletePreset(presetId, (nextId) => {
        refreshDialog(nextId);
      });
    });

    createBtn?.addEventListener("click", async () => {
      await createNewPreset((newId) => {
        refreshDialog(newId);
      });
    });

    exportBtn?.addEventListener("click", async () => {
      const presetId = presetSelect?.value ?? DEFAULT_PRESET_ID;
      exportPreset(presetId, MODULE_ID, DEFAULT_PRESET_ID);
    });

    importBtn?.addEventListener("click", async () => {
      await importPreset((newId) => {
        refreshDialog(newId);
      }, MODULE_ID, DEFAULT_PRESET_ID);
    });
  };

  const activePresetId = getActivePresetId();
  const content = buildDialogContent(activePresetId);

  const dialog = new Dialog({
    title: "Manage Presets",
    content,
    buttons: {
      close: {
        label: "Close"
      }
    },
    default: "close",
    render: () => {
      attachDialogListeners(activePresetId);
    },
    close: async () => {
      // When dialog closes, set the currently selected preset as active
      const presetSelect = dialog.element?.[0]?.querySelector("#presetSelect");
      if (presetSelect) {
        const selectedPresetId = presetSelect.value ?? DEFAULT_PRESET_ID;
        const currentActiveId = getActivePresetId();

        if (selectedPresetId !== currentActiveId) {
          await game.settings.set(MODULE_ID, "activeBaselinePresetId", selectedPresetId);
          await rerenderBaselineManagers();
        }
      }
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
  return utilFunctions.mergeWithRequiredModuleIds(
    utilFunctions.parseModuleIdList(game.settings.get(MODULE_ID, "globalBaselineModules"))
  );
}

async function updateTitleCache(settingKey, ids) {
  const map = utilFunctions.parseTitlesMap(game.settings.get(MODULE_ID, settingKey));
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

function injectCharacterManagerButton(actor, form) {
  const header = form.querySelector('header.window-header');
  if (!header) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'header-control icon fa-solid fa-users';
  button.setAttribute('data-tooltip', 'Character Manager');
  button.setAttribute('aria-label', 'Character Manager');
  button.title = 'Open Character Manager';

  button.addEventListener('click', () => {
    const charManager = new CharacterManager({ actor: actor });
    charManager.render(true);
  });

  const closeButton = header.querySelector('[data-action="close"]');
  if (closeButton) {
    header.insertBefore(button, closeButton);
  }
}

Hooks.once("init", () => {
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
    CharacterManager,
    handleVisibilitySettingsChanged
  });

  // Setup character creation tools
  setupCharacterCreationTools();

  // Register Handlebars helpers for character creation templates
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('in', (value, collection) => {
    if (Array.isArray(collection)) return collection.includes(value);
    if (typeof collection === 'object' && collection !== null) return value in collection;
    return false;
  });
  Handlebars.registerHelper('capitalize', (str) => {
    if (typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
  Handlebars.registerHelper('skills-count', (obj) => {
    if (typeof obj !== 'object' || obj === null) return 0;
    return Object.keys(obj).length;
  });
  Handlebars.registerHelper('array', (...args) => {
    // Remove the last argument which is the Handlebars context object
    args.pop();
    return args;
  });
  Handlebars.registerHelper('gte', (a, b) => a >= b);
  Handlebars.registerHelper('gt', (a, b) => a > b);
  Handlebars.registerHelper('lt', (a, b) => a < b);
  Handlebars.registerHelper('add', (a, b) => a + b);
  Handlebars.registerHelper('dieLt', (a, b) => {
    const dieOrder = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12 };
    return (dieOrder[a] ?? 0) < (dieOrder[b] ?? 0);
  });
  Handlebars.registerHelper('and', (...args) => {
    args.pop(); // Remove Handlebars context object
    return args.every(arg => arg);
  });
  Handlebars.registerHelper('or', (...args) => {
    args.pop(); // Remove Handlebars context object
    return args.some(arg => arg);
  });
  Handlebars.registerHelper('subtract', (a, b) => a - b);
  Handlebars.registerHelper('keys', (obj) => {
    if (typeof obj !== 'object' || obj === null) return [];
    return Object.keys(obj);
  });
  Handlebars.registerHelper('lookup', (obj, key) => {
    if (typeof obj === 'object' && obj !== null) {
      return obj[key];
    }
    return undefined;
  });
  Handlebars.registerHelper('stripHtml', (html) => {
    if (typeof html !== 'string') return html;

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');

    // Decode HTML entities using a temporary DOM element
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || text;

    // Truncate long descriptions for tooltips
    if (text.length > 200) {
      text = text.substring(0, 200) + '...';
    }

    return text.trim();
  });

  // Expose APIs and functions to window for app classes
  window.swadeFwkPresetApi = presetApi;
  window.swadeFwkDependencyApi = dependencyApi;
  Object.assign(window, utilFunctions);

  // Expose additional helper functions
  window.promptForDependencyResolution = promptForDependencyResolution;
  window.openPresetManagementDialog = openPresetManagementDialog;
  window.handleVisibilitySettingsChanged = handleVisibilitySettingsChanged;

  // Expose app classes
  window.BaselineModulesManager = BaselineModulesManager;
  window.ExtraVisiblePacksSelector = ExtraVisiblePacksSelector;
  window.CharacterManager = CharacterManager;
});

async function registerTemplatePartials() {
  try {
    // IMPORTANT: When adding new tab partials (e.g., traits-tab, edges-tab, gear-tab, summary-tab):
    // 1. Create the partial template file in templates/character-creation/_components/
    // 2. Include it in templates/character-creation/character-manager.hbs with {{> partial-name}}
    // 3. ADD THE PARTIAL NAME TO THIS ARRAY so it gets registered with Handlebars
    // Without this registration step, the partial will not load and the template will fail silently
    const partials = ['concept-tab', 'ancestry-tab', 'hindrances-tab', 'traits-tab', 'edges-tab', 'gear-tab', 'summary-tab', 'advancement-tab'];
    for (const partial of partials) {
      const path = `modules/${MODULE_ID}/templates/character-creation/_components/${partial}.hbs`;
      const html = await fetch(path).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch ${path}: ${r.statusText}`);
        return r.text();
      });
      Handlebars.registerPartial(partial, html);
    }
    console.log('[SWADE FWK] Template partials registered:', partials);
  } catch (error) {
    console.error('[SWADE FWK] Failed to register template partials:', error);
  }
}

Hooks.once("ready", async () => {
  console.log('[SWADE FWK] Ready hook fired - testing hook system');

  // Register template partials
  await registerTemplatePartials();

  // Test that hook registration works
  Hooks.once("test-swade-fwk", () => {
    console.log('[SWADE FWK] Test hook fired!');
  });
  Hooks.call("test-swade-fwk");

  // Watch for SWADE character sheets in the DOM and inject Character Manager button
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1 && node.classList?.contains('swade-official') && node.classList?.contains('actor')) {
          console.log('[SWADE FWK] Found SWADE character sheet in DOM');

          // Try to get actor from the form ID (format: CharacterSheet-Actor-[DOCID])
          const formId = node.id;
          const docMatch = formId.match(/-([a-zA-Z0-9]+)$/);
          const docId = docMatch?.[1];

          if (docId) {
            const actor = game.actors?.get(docId);
            if (actor?.type === 'character' && !node.dataset.swadeFwkButtonAdded) {
              console.log('[SWADE FWK] Found actor:', actor.name);
              injectCharacterManagerButton(actor, node);
              node.dataset.swadeFwkButtonAdded = 'true';
            } else if (!actor) {
              console.warn('[SWADE FWK] Could not find actor with ID:', docId);
            }
          } else {
            console.warn('[SWADE FWK] Could not extract actor ID from form:', formId);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[SWADE FWK] DOM observer installed for character sheets');

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

  await syncSearchModulePackRestrictions();
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

