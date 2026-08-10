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
    hint: "Pick which module and external packs players can see while Curated Mode is enabled.",
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
    default: [
      "swade-fantasy-world-kit.actions-fantasy",
      "swade-fantasy-world-kit.ancestries-fantasy",
      "swade-fantasy-world-kit.armor-and-shields-fantasy",
      "swade-fantasy-world-kit.armor-sets-fantasy",
      "swade-fantasy-world-kit.edges-fantasy",
      "swade-fantasy-world-kit.gear-fantasy",
      "swade-fantasy-world-kit.hindrances-fantasy",
      "swade-fantasy-world-kit.magic-items-fantasy",
      "swade-fantasy-world-kit.powers-fantasy",
      "swade-fantasy-world-kit.pregens-fantasy",
      "swade-fantasy-world-kit.skills-fantasy",
      "swade-fantasy-world-kit.weapons-fantasy"
    ].join("\n"),
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

  game.settings.register(MODULE_ID, "bonusEdgePointAbilityNames", {
    name: "Free-Edge Ancestral Ability Names",
    hint: "Comma-separated ancestral ability names (e.g. 'Adaptable') that grant a free Edge at character creation. Matched by name, so this works with any ancestry from any compendium/setting — add more names here if another setting's Human (or other) ancestry uses a different term.",
    scope: "world",
    config: true,
    type: String,
    default: "Adaptable"
  });

  game.settings.register(MODULE_ID, "ancestryChoiceAbilityNames", {
    name: "Bonus-Choice Ancestral Ability Names",
    hint: "Comma-separated ancestral ability names (e.g. 'Half-Elves-Heritage') that let the player pick a bonus (Edge/Attribute/Skill point) on the Ancestry tab, for abilities whose compendium entry has no mechanical effects of its own. Matched by name — add more here for other settings' similar \"choose one\" heritage abilities.",
    scope: "world",
    config: true,
    type: String,
    default: "Half-Elves-Heritage"
  });

  // Character Manager: additional compendium packs, merged in alongside this module's
  // built-in Fantasy packs (not a replacement for them). Comma/semicolon/whitespace-separated
  // pack IDs, e.g. "my-module.custom-edges". Each is scoped to the data type it feeds.
  game.settings.register(MODULE_ID, "additionalAncestryPacks", {
    name: "Character Manager: Additional Ancestry Packs",
    hint: "Comma-separated compendium pack IDs (e.g. 'my-module.custom-ancestries') to include alongside the built-in Fantasy ancestries in Character Manager.",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: handleVisibilitySettingsChanged
  });

  game.settings.register(MODULE_ID, "additionalSkillPacks", {
    name: "Character Manager: Additional Skill Packs",
    hint: "Comma-separated compendium pack IDs to include alongside the built-in Fantasy skills in Character Manager.",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: handleVisibilitySettingsChanged
  });

  game.settings.register(MODULE_ID, "useCuratedSkillIcons", {
    name: "Character Manager: Use Curated Skill Icons",
    hint: "When saving, any of the actor's skills that name-match a skill in the configured compendiums have their icon and description replaced with the compendium's version (die and advances are untouched). Useful for swapping a SWADE core-created character's default skills for this kit's curated equivalents.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "additionalEdgePacks", {
    name: "Character Manager: Additional Edge Packs",
    hint: "Comma-separated compendium pack IDs to include alongside the built-in Fantasy edges in Character Manager.",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: handleVisibilitySettingsChanged
  });

  game.settings.register(MODULE_ID, "additionalHindrancePacks", {
    name: "Character Manager: Additional Hindrance Packs",
    hint: "Comma-separated compendium pack IDs to include alongside the built-in Fantasy hindrances in Character Manager.",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: handleVisibilitySettingsChanged
  });

  game.settings.register(MODULE_ID, "richFundsMultipliers", {
    name: "Character Manager: Rich Edge Funds Multipliers",
    hint: "Comma-separated 'Edge Name:multiplier' pairs (e.g. 'Rich:3,Filthy Rich:5') that multiply starting gear funds when the character has that edge. Matched by name, so this works with any setting's Rich/Filthy Rich-equivalent edge.",
    scope: "world",
    config: true,
    type: String,
    default: "Rich:3,Filthy Rich:5"
  });

  game.settings.register(MODULE_ID, "additionalGearPacks", {
    name: "Character Manager: Additional Gear Packs",
    hint: "Comma-separated compendium pack IDs (gear, weapons, or armor) to include alongside the built-in Fantasy equipment in Character Manager.",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: handleVisibilitySettingsChanged
  });
}
