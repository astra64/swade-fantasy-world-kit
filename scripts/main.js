const MODULE_ID = "swade-consolidated-fantasy-compendiums";

function rerenderCompendiumDirectory() {
  ui.compendium?.render(true);
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
    rerenderCompendiumDirectory();
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
    hint: "Show only curated module compendiums to players.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: rerenderCompendiumDirectory
  });

  game.settings.register(MODULE_ID, "gmSeesAllPacks", {
    name: "GM Sees All Packs",
    hint: "When enabled, GMs can still see non-curated packs while players are filtered.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: rerenderCompendiumDirectory
  });

  game.settings.register(MODULE_ID, "extraVisiblePacks", {
    name: "Extra Visible Packs (Advanced)",
    hint: "Advanced manual input. Prefer the 'Choose Visible Packs' menu button above.",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: rerenderCompendiumDirectory
  });
});

Hooks.on("renderCompendiumDirectory", (_app, html) => {
  const root = html?.[0] ?? html;
  if (!root?.querySelectorAll) return;

  const curatedMode = game.settings.get(MODULE_ID, "curatedMode");
  const gmSeesAllPacks = game.settings.get(MODULE_ID, "gmSeesAllPacks");
  const extraVisiblePacks = parseVisiblePackList(
    game.settings.get(MODULE_ID, "extraVisiblePacks")
  );
  const isGM = game.user?.isGM === true;
  const modulePrefix = `${MODULE_ID}.`;

  for (const element of root.querySelectorAll("[data-pack]")) {
    const packId = element.dataset.pack ?? "";
    const isCuratedPack = packId.startsWith(modulePrefix);
    const isWhitelistedPack = extraVisiblePacks.has(packId);

    element.classList.remove("scfc-hidden-pack");

    if (!curatedMode) continue;
    if (isGM && gmSeesAllPacks) continue;
    if (isCuratedPack) continue;
    if (isWhitelistedPack) continue;

    element.classList.add("scfc-hidden-pack");
  }
});
