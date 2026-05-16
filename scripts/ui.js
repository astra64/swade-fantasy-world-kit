const MODULE_ID = "swade-fantasy-world-kit";
const COMPANION_BANNER_CACHE = { urls: null };

export function setupUI(config) {
  const {
    parseVisiblePackList,
    openBaselineManager
  } = config;

  function getCompanionBannerUrl() {
    if (COMPANION_BANNER_CACHE.urls) return COMPANION_BANNER_CACHE.urls;

    const row = document.querySelector("[data-pack='swade-fantasy-companion.swade-fc-deck']");
    const src = row?.querySelector("img.compendium-banner")?.getAttribute("src") ?? null;

    const urls = src ? [src] : [];
    if (urls.length > 0) COMPANION_BANNER_CACHE.urls = urls;
    return urls;
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

  function styleAndFilterCompendiumRows(htmlRoot) {
    const root = htmlRoot?.[0] ?? htmlRoot;
    if (!root?.querySelectorAll) return;

    const alternateBanners = getCompanionBannerUrl();
    let ownedPackIndex = 0;

    const rowNodes = root.querySelectorAll("[data-pack], [data-entry-id]");
    for (const element of rowNodes) {
      const packId = element.dataset.pack ?? element.dataset.entryId ?? "";
      if (!packId.includes(".")) continue;

      const packageId = packId.split(".")[0] ?? "";
      const row = element.closest(".directory-item, li") ?? element;
      const isSwadePack = packageId === MODULE_ID;

      element.classList.remove("scfc-hidden-pack");
      element.classList.toggle("scfc-swade-pack", isSwadePack);
      row.classList.toggle("scfc-swade-pack", isSwadePack);

      const bannerElement = row.querySelector("img.compendium-banner") ?? element.querySelector?.("img.compendium-banner");
      if (bannerElement) {
        if (!bannerElement.dataset.scfcOriginalSrc) {
          bannerElement.dataset.scfcOriginalSrc = bannerElement.getAttribute("src") ?? "";
        }

        if (isSwadePack && alternateBanners.length > 0) {
          bannerElement.setAttribute("src", alternateBanners[ownedPackIndex % alternateBanners.length]);
          ownedPackIndex++;
        } else if (!isSwadePack) {
          const originalSrc = bannerElement.dataset.scfcOriginalSrc;
          if (originalSrc) bannerElement.setAttribute("src", originalSrc);
        }
      }

      if (isPackAllowedForUser(packId, game.user)) continue;

      element.classList.add("scfc-hidden-pack");
    }
  }

  function injectSettingsQuickAccessButton(htmlRoot) {
    if (!game.user?.isGM) return;
    if (!game.settings.get(MODULE_ID, "gmQuickAccessSidebarButton")) return;

    const root = htmlRoot?.[0] ?? htmlRoot ?? document;
    if (!root?.querySelector) return;

    if (document.querySelector("[data-scfc-quick-access-section]")) return;

    const candidateContainers = [
      "#settings-buttons",
      ".tab[data-tab='settings'] #settings-buttons",
      "#sidebar .tab[data-tab='settings'] #settings-buttons",
      "#sidebar .tab[data-tab='settings'] .settings-list",
      "#sidebar #settings .settings-list",
      "#sidebar #settings",
      "#settings"
    ];

    let settingsButtons = null;
    for (const selector of candidateContainers) {
      settingsButtons = root.querySelector(selector) ?? document.querySelector(selector);
      if (settingsButtons) break;
    }
    if (!settingsButtons) return;

    const section = document.createElement("section");
    section.dataset.scfcQuickAccessSection = "1";
    section.className = "scfc-gm-quick-access-section";

    const title = document.createElement("h2");
    title.className = "scfc-gm-quick-access-title";
    title.textContent = "SWADE Fantasy World Kit";

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.scfcOpenBaselineManager = "1";
    button.className = "scfc-gm-quick-access";
    button.innerHTML = '<i class="fas fa-puzzle-piece"></i> Preset Modules';
    button.addEventListener("click", () => openBaselineManager());

    section.appendChild(title);
    section.appendChild(button);
    settingsButtons.appendChild(section);
  }

  function tryInjectSettingsQuickAccessButton() {
    injectSettingsQuickAccessButton(document);
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

    const playerRestrictedRoles = [CONST.USER_ROLES.PLAYER, CONST.USER_ROLES.TRUSTED];
    const gmRole = CONST.USER_ROLES.GAMEMASTER;

    for (const pack of game.packs.values()) {
      const packId = pack.collection;
      const isAllowedForPlayers = isPackAllowedForUser(packId, {
        isGM: false,
        role: CONST.USER_ROLES.PLAYER
      });
      const isAllowedForGMs = isPackAllowedForUser(packId, {
        isGM: true,
        role: gmRole
      });

      const existingRoles = Array.isArray(next.packs[packId]) ? [...next.packs[packId]] : [];
      const roleSet = new Set(existingRoles);

      if (isAllowedForPlayers) {
        for (const role of playerRestrictedRoles) roleSet.delete(role);
      } else {
        for (const role of playerRestrictedRoles) roleSet.add(role);
      }

      if (isAllowedForGMs) {
        roleSet.delete(gmRole);
      } else {
        roleSet.add(gmRole);
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

  return {
    styleAndFilterCompendiumRows,
    injectSettingsQuickAccessButton,
    tryInjectSettingsQuickAccessButton,
    applyPlayerPackAccessPatch,
    syncQuickInsertPackRestrictions
  };
}
