const MODULE_ID = "swade-consolidated-fantasy-compendiums";

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
      title: "SWADE Fantasy: Choose Visible Packs",
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

function parseVisiblePackList(rawValue) {
  if (typeof rawValue !== "string") return new Set();

  return new Set(
    rawValue
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
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
    "SWADE Fantasy: Quick Insert pack restrictions synced. Have players reload to refresh search results."
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
});

Hooks.once("ready", () => {
  applyPlayerPackAccessPatch();

  syncQuickInsertPackRestrictions();
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
