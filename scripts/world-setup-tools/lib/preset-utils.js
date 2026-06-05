export function parseVisiblePackList(rawValue) {
  if (typeof rawValue !== "string") return new Set();

  return new Set(
    rawValue
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

export function parseTitlesMap(raw) {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}

export function parseModuleIdList(rawValue) {
  if (typeof rawValue !== "string") return [];

  return [...new Set(
    rawValue
      .split(/[\n,]/)
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => entry.length > 0 && entry !== "null" && entry !== "undefined")
  )];
}

function normalizeModuleIdArray(ids) {
  if (!Array.isArray(ids)) return [];

  return [...new Set(
    ids
      .map((id) => String(id ?? "").trim())
      .filter((id) => id.length > 0 && id !== "null" && id !== "undefined")
  )];
}

function parsePresetMap(raw, defaultPresetId) {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const source = parsed && typeof parsed === "object" ? parsed : {};
    const map = {};

    for (const [id, preset] of Object.entries(source)) {
      const normalizedId = String(id ?? "").trim();
      if (!normalizedId) continue;

      const name = typeof preset?.name === "string" && preset.name.trim().length > 0
        ? preset.name.trim()
        : normalizedId;
      const moduleIds = normalizeModuleIdArray(preset?.moduleIds);

      map[normalizedId] = { name, moduleIds };
    }

    if (!map[defaultPresetId]) {
      map[defaultPresetId] = { name: "Default", moduleIds: [] };
    }
    return map;
  } catch {
    return { [defaultPresetId]: { name: "Default", moduleIds: [] } };
  }
}

function presetNameExists(name, presets, excludeId = null) {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return false;

  for (const [id, preset] of Object.entries(presets)) {
    if (excludeId && id === excludeId) continue;
    const presetName = String(preset?.name ?? id).trim().toLowerCase();
    if (presetName === normalized) return true;
  }

  return false;
}

function suggestUniquePresetName(baseName, presets, excludeId = null) {
  const base = String(baseName ?? "").trim() || "Preset";
  if (!presetNameExists(base, presets, excludeId)) return base;

  let i = 2;
  while (presetNameExists(`${base} ${i}`, presets, excludeId)) {
    i += 1;
  }

  return `${base} ${i}`;
}

export function createPresetApi({ moduleId, defaultPresetId }) {
  function getPresetMap() {
    const map = parsePresetMap(game.settings.get(moduleId, "namedBaselinePresets"), defaultPresetId);
    if (!map[defaultPresetId]) {
      const legacyBaselineIds = parseModuleIdList(game.settings.get(moduleId, "baselineModules"));
      map[defaultPresetId] = {
        name: "Default",
        moduleIds: legacyBaselineIds
      };
    }
    return map;
  }

  function getActivePresetId() {
    return String(game.settings.get(moduleId, "activeBaselinePresetId") ?? defaultPresetId);
  }

  function getAppliedPresetId() {
    return String(game.settings.get(moduleId, "appliedBaselinePresetId") ?? defaultPresetId);
  }

  function getActivePresetMeta() {
    const presetMap = getPresetMap();
    const activePresetId = getActivePresetId();
    const preset = presetMap[activePresetId];
    const presetName = typeof preset?.name === "string" && preset.name.trim().length > 0
      ? preset.name.trim()
      : (activePresetId === defaultPresetId ? "Default" : activePresetId);
    const moduleIds = normalizeModuleIdArray(preset?.moduleIds);

    return {
      id: activePresetId,
      name: presetName,
      moduleCount: moduleIds.length
    };
  }

  function getAppliedPresetMeta() {
    const presetMap = getPresetMap();
    const appliedPresetId = getAppliedPresetId();
    const resolvedId = presetMap[appliedPresetId] ? appliedPresetId : defaultPresetId;
    const preset = presetMap[resolvedId];
    const fallbackName = resolvedId === defaultPresetId ? "Default" : resolvedId;

    return {
      id: resolvedId,
      name: preset?.name ?? fallbackName
    };
  }

  async function sanitizeAppliedPresetId() {
    const presetMap = getPresetMap();
    const appliedPresetId = getAppliedPresetId();
    if (presetMap[appliedPresetId]) return;

    await game.settings.set(moduleId, "appliedBaselinePresetId", defaultPresetId);
  }

  function getActivePresetModuleIds() {
    const presetMap = getPresetMap();
    const activePresetId = getActivePresetId();
    const preset = presetMap[activePresetId];

    return normalizeModuleIdArray(preset?.moduleIds);
  }

  async function setActivePresetModuleIds(moduleIds) {
    const presetMap = getPresetMap();
    const activePresetId = getActivePresetId();
    const currentPreset = presetMap[activePresetId] ?? {
      name: activePresetId === defaultPresetId ? "Default" : activePresetId,
      moduleIds: []
    };

    const normalizedIds = normalizeModuleIdArray(moduleIds);

    presetMap[activePresetId] = {
      ...currentPreset,
      moduleIds: normalizedIds
    };

    await game.settings.set(moduleId, "namedBaselinePresets", JSON.stringify(presetMap));
  }

  return {
    getPresetMap,
    getActivePresetId,
    getAppliedPresetId,
    getActivePresetMeta,
    getAppliedPresetMeta,
    sanitizeAppliedPresetId,
    getActivePresetModuleIds,
    setActivePresetModuleIds,
    parsePresetMap: (raw) => parsePresetMap(raw, defaultPresetId),
    presetNameExists,
    suggestUniquePresetName
  };
}
