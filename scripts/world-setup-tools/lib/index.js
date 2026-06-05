import { createPresetApi, parseModuleIdList, parseTitlesMap, parseVisiblePackList } from "./preset-utils.js";
import { createDependencyApi } from "./dependencies.js";

export function createWorldSetupToolsApi({ moduleId, defaultPresetId }) {
  const presetApi = createPresetApi({ moduleId, defaultPresetId });
  const dependencyApi = createDependencyApi({ moduleId });

  const {
    getRequiredModuleIds,
    getModuleDependencies,
    collectAllDependencies,
    resolveMissingDependencies,
    mergeWithRequiredModuleIds
  } = dependencyApi;

  const {
    setActivePresetModuleIds
  } = presetApi;

  const utilFunctions = {
    parseModuleIdList,
    parseTitlesMap,
    parseVisiblePackList,
    buildSelectionSignature: (ids) => {
      return [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .join("\n");
    },
    getRequiredModuleIds,
    getModuleDependencies,
    collectAllDependencies,
    resolveMissingDependencies,
    mergeWithRequiredModuleIds,
    setActivePresetModuleIds,
    updateTitleCache: async (settingKey, ids) => {
      const map = parseTitlesMap(game.settings.get(moduleId, settingKey));
      const idSet = new Set(ids);
      for (const id of ids) {
        const title = game.modules.get(id)?.title;
        if (title) map[id] = title;
      }
      for (const id of Object.keys(map)) {
        if (!idSet.has(id)) delete map[id];
      }
      await game.settings.set(moduleId, settingKey, JSON.stringify(map));
    }
  };

  return {
    presetApi,
    dependencyApi,
    utilFunctions
  };
}
