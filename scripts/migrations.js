const MODULE_ID = "swade-fantasy-world-kit";
const LEGACY_MODULE_ID = "swade-consolidated-fantasy-compendiums";
const MIGRATABLE_WORLD_SETTING_KEYS = [
  "curatedMode",
  "gmSeesAllPacks",
  "extraVisiblePacks",
  "baselineModules"
];
const MIGRATABLE_CLIENT_SETTING_KEYS = ["globalBaselineModules"];

export function setupMigrations(config) {
  const {
    parseModuleIdList,
    buildSelectionSignature,
    parsePresetMap
  } = config;

  function getStoredSettingValue(scope, moduleId, key) {
    try {
      const storage = game.settings.storage?.get?.(scope);
      if (!storage || typeof storage.get !== "function") return undefined;
      const setting = storage.get(`${moduleId}.${key}`);
      return setting?.value;
    } catch (error) {
      return undefined;
    }
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

  return {
    migrateLegacyModuleSettings,
    sanitizeBaselineModules,
    sanitizeNamedPresets,
    findModulesWithInvalidDependencyMetadata
  };
}
