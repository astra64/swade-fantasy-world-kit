const MODULE_ID = "swade-fantasy-world-kit";
const DEFAULT_PRESET_ID = "default";

export function setupSettings(config) {
  const {
    BaselineModulesManager,
    ExtraVisiblePacksSelector,
    handleVisibilitySettingsChanged
  } = config;

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
}
