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

export function validatePresetExport(json) {
  try {
    const data = typeof json === "string" ? JSON.parse(json) : json;

    if (!data || typeof data !== "object") {
      return { valid: false, error: "Preset file is invalid" };
    }

    if (typeof data.schemaVersion !== "number") {
      return { valid: false, error: "Preset file is missing schema version" };
    }

    if (data.schemaVersion !== 1) {
      return { valid: false, error: `Preset file schema version ${data.schemaVersion} is not supported` };
    }

    if (typeof data.presetName !== "string" || data.presetName.trim().length === 0) {
      return { valid: false, error: "Preset file is missing preset name" };
    }

    if (!Array.isArray(data.moduleIds)) {
      return { valid: false, error: "Preset file is missing module IDs list" };
    }

    return { valid: true, data };
  } catch (err) {
    return { valid: false, error: "Preset file is not valid JSON" };
  }
}

export function exportPresetToClipboard(presetId, moduleId, defaultPresetId) {
  const presetMap = parsePresetMap(
    game.settings.get(moduleId, "namedBaselinePresets"),
    defaultPresetId
  );

  const preset = presetMap[presetId];
  if (!preset) {
    ui.notifications?.error("Preset not found");
    return;
  }

  const exportData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    presetName: preset.name,
    moduleIds: preset.moduleIds ?? []
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  navigator.clipboard.writeText(jsonString).then(() => {
    ui.notifications?.info(`Preset "${preset.name}" copied to clipboard`);
  }).catch(() => {
    ui.notifications?.error("Could not copy to clipboard");
  });
}

export function exportPreset(presetId, moduleId, defaultPresetId) {
  exportPresetToClipboard(presetId, moduleId, defaultPresetId);
}

async function completeImport(presetName, moduleIds, presetMap, moduleId) {
  const uniqueName = suggestUniquePresetName(presetName, presetMap);
  const newId = `preset-${Date.now()}`;

  presetMap[newId] = {
    name: uniqueName,
    moduleIds
  };

  await game.settings.set(moduleId, "namedBaselinePresets", JSON.stringify(presetMap));
  ui.notifications?.info(`Preset "${uniqueName}" imported`);

  return newId;
}

export function importPreset(onComplete, moduleId, defaultPresetId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async () => {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    try {
      const text = await file.text();
      const validation = validatePresetExport(text);

      if (!validation.valid) {
        ui.notifications?.error(`Invalid preset file: ${validation.error}`);
        return;
      }

      const { data } = validation;
      const presetName = String(data.presetName).trim();
      const moduleIds = normalizeModuleIdArray(data.moduleIds ?? []);

      const presetMap = parsePresetMap(
        game.settings.get(moduleId, "namedBaselinePresets"),
        defaultPresetId
      );

      const installedModules = new Set([...game.modules.keys()]);
      const missingModules = moduleIds.filter((id) => !installedModules.has(id));

      if (missingModules.length > 0) {
        const missingList = missingModules
          .map((id) => `<li>${game.modules.get(id)?.title ?? id}</li>`)
          .join("");

        const content = `
          <p>The following modules in this preset are not installed:</p>
          <ul>${missingList}</ul>
          <p>Choose how to proceed:</p>
        `;

        const dialog = new Dialog({
          title: "Some modules not installed",
          content,
          buttons: {
            importAnyway: {
              label: "Import Anyway",
              callback: async () => {
                const newId = await completeImport(presetName, moduleIds, presetMap, moduleId);
                onComplete?.(newId);
              }
            },
            filterAndImport: {
              label: "Filter & Import",
              callback: async () => {
                const filteredIds = moduleIds.filter((id) => installedModules.has(id));
                const newId = await completeImport(presetName, filteredIds, presetMap, moduleId);
                onComplete?.(newId);
              }
            },
            cancel: {
              label: "Cancel"
            }
          },
          default: "importAnyway"
        });

        dialog.render(true);
      } else {
        const newId = await completeImport(presetName, moduleIds, presetMap, moduleId);
        onComplete?.(newId);
      }
    } catch (err) {
      ui.notifications?.error("Could not read preset file");
      console.error(err);
    }
  };

  input.click();
}
