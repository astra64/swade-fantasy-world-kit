export function createDependencyApi({ moduleId }) {
  function getRequiredModuleIds() {
    const thisModule = game.modules.get(moduleId);
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

  function getModuleDependencies(moduleKey) {
    const module = game.modules.get(moduleKey);
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

      if (!depModule) continue;

      const isActive = depModule.active ?? false;
      const isInConfig = currentModuleConfig[depId] === true;
      if (!isActive && !isInConfig) {
        missingDeps.push(depId);
      }
    }

    return missingDeps;
  }

  function mergeWithRequiredModuleIds(moduleIds) {
    const merged = new Set(moduleIds);
    for (const id of getRequiredModuleIds()) merged.add(id);
    return [...merged];
  }

  return {
    getRequiredModuleIds,
    getModuleDependencies,
    collectAllDependencies,
    resolveMissingDependencies,
    mergeWithRequiredModuleIds
  };
}
