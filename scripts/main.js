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

class ExtraVisiblePacksSelector extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-pack-selector`,
      classes: ["scfc-pack-selector"],
      title: "SWADE Fantasy World Kit: Choose Visible Packs",
      template: `modules/${MODULE_ID}/templates/pack-selector.hbs`,
      width: 640,
      height: 720,
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  getData() {
    const selected = parseVisiblePackList(game.settings.get(MODULE_ID, "extraVisiblePacks"));
    const packs = [...game.packs.values()]
      .map((pack) => {
        const id = pack.collection;
        const label = pack.metadata?.label ?? id;
        const moduleId = id.split(".")[0] ?? "";
        return {
          id,
          label,
          moduleId,
          selected: selected.has(id),
          searchText: `${id} ${label} ${moduleId}`.toLowerCase()
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

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
      .map((module) => {
        const id = module.id;
        const title = module.title ?? id;
        const searchText = `${title} ${id}`.toLowerCase();

        return {
          id,
          title,
          active: Boolean(module.active),
          required: requiredIds.has(id),
          selected: selectedIds.has(id),
          searchText
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    const configured = [...selectedIds].map((id) => {
      const module = game.modules.get(id);
      return {
        id,
        installed: Boolean(module),
        active: Boolean(module?.active)
      };
    });

    return {
      installedModules,
      hasInstalledModules: installedModules.length > 0,
      configured,
      hasConfigured: configured.length > 0
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    const applyButton = html[0].querySelector("[data-apply-baseline]");
    const searchInput = html[0].querySelector("[data-module-search]");
    const moduleRows = [...html[0].querySelectorAll("[data-module-row]")];
    const selectActiveButton = html[0].querySelector("[data-module-select-active]");
    const clearSelectionButton = html[0].querySelector("[data-module-clear-selection]");
    const loadGlobalButton = html[0].querySelector("[data-module-load-global]");
    const saveGlobalButton = html[0].querySelector("[data-module-save-global]");
    const applyGlobalButton = html[0].querySelector("[data-module-apply-global]");

    searchInput?.addEventListener("input", (event) => {
      const term = (event.currentTarget.value ?? "").toLowerCase().trim();

      for (const row of moduleRows) {
        const searchText = (row.dataset.search ?? "").toLowerCase();
        const visible = !term || searchText.includes(term);
        row.style.display = visible ? "" : "none";
      }
    });

    selectActiveButton?.addEventListener("click", () => {
      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        const isRequired = row.dataset.required === "true";
        const isActive = row.dataset.active === "true";
        if (checkbox) checkbox.checked = isRequired || isActive;
      }
    });

    clearSelectionButton?.addEventListener("click", () => {
      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        const isRequired = row.dataset.required === "true";
        if (checkbox) checkbox.checked = isRequired;
      }
    });

    loadGlobalButton?.addEventListener("click", () => {
      const globalIds = new Set(getGlobalBaselineModuleIds());

      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        if (!checkbox) continue;

        const isRequired = row.dataset.required === "true";
        checkbox.checked = isRequired || globalIds.has(checkbox.value);
      }
    });

    saveGlobalButton?.addEventListener("click", async () => {
      const selectedIds = [];

      for (const row of moduleRows) {
        const checkbox = row.querySelector("input[type=checkbox]");
        if (!checkbox?.checked) continue;
        selectedIds.push(checkbox.value);
      }

      const normalized = mergeWithRequiredModuleIds(selectedIds).join("\n");
      await game.settings.set(MODULE_ID, "globalBaselineModules", normalized);
      ui.notifications?.info("SWADE Fantasy World Kit global baseline profile saved.");
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
      await this._onApplyBaseline();
    });

    applyButton?.addEventListener("click", async () => {
      await this._onApplyBaseline();
    });
  }

  async _onApplyBaseline() {
    const apply = await Dialog.confirm({
      title: "Apply Baseline Modules",
      content: "<p>This will enable installed modules from your baseline list for this world. Missing modules are skipped.</p>",
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    if (!apply) return;

    const configuredIds = mergeWithRequiredModuleIds(
      parseModuleIdList(game.settings.get(MODULE_ID, "baselineModules"))
    );
    const missing = [];
    const alreadyEnabled = [];
    const enabledNow = [];

    const moduleConfiguration = foundry.utils.deepClone(
      game.settings.get("core", "moduleConfiguration") ?? {}
    );

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
      `Missing: ${missing.length}`
    ].join(" | ");

    ui.notifications?.info(`SWADE Fantasy World Kit baseline apply complete. ${summary}`);
    if (missing.length > 0) {
      console.warn("[SWADE Fantasy World Kit] Missing baseline modules:\n" + missing.join("\n"));
    }

    await this.render(true);
  }

  async _updateObject(_event, formData) {
    const values = formData.baselineModulesSelected;
    const selected = Array.isArray(values) ? values : (values ? [values] : []);
    const normalizedIds = mergeWithRequiredModuleIds(
      [...new Set(selected.map((entry) => String(entry).trim()).filter(Boolean))]
    );
    const normalized = normalizedIds.join("\n");

    await game.settings.set(MODULE_ID, "baselineModules", normalized);
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

  const restrictedRoles = [CONST.USER_ROLES.PLAYER, CONST.USER_ROLES.TRUSTED];

  for (const pack of game.packs.values()) {
    const packId = pack.collection;
    const isAllowedForPlayers = isPackAllowedForUser(packId, {
      isGM: false,
      role: CONST.USER_ROLES.PLAYER
    });

    const existingRoles = Array.isArray(next.packs[packId]) ? [...next.packs[packId]] : [];
    const roleSet = new Set(existingRoles);

    if (isAllowedForPlayers) {
      for (const role of restrictedRoles) roleSet.delete(role);
    } else {
      for (const role of restrictedRoles) roleSet.add(role);
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

  await syncQuickInsertPackRestrictions();
});

Hooks.on("renderCompendiumDirectory", (_app, html) => {
  const root = html?.[0] ?? html;
  if (!root?.querySelectorAll) return;

  for (const element of root.querySelectorAll("[data-pack]")) {
    const packId = element.dataset.pack ?? "";

    element.classList.remove("scfc-hidden-pack");

    if (isPackAllowedForUser(packId, game.user)) continue;

    element.classList.add("scfc-hidden-pack");
  }
});
