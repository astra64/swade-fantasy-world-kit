const MODULE_ID = "swade-consolidated-fantasy-compendiums";

function rerenderCompendiumDirectory() {
  ui.compendium?.render(true);
}

Hooks.once("init", () => {
  console.log(`[${MODULE_ID}] init`);

  game.settings.register(MODULE_ID, "curatedMode", {
    name: "Curated Mode",
    hint: "Show only curated module compendiums to players.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: rerenderCompendiumDirectory
  });
});

Hooks.on("renderCompendiumDirectory", (_app, html) => {
  const root = html?.[0] ?? html;
  if (!root?.querySelectorAll) return;

  const curatedMode = game.settings.get(MODULE_ID, "curatedMode");
  const isGM = game.user?.isGM === true;
  const modulePrefix = `${MODULE_ID}.`;

  for (const element of root.querySelectorAll("[data-pack]")) {
    const packId = element.dataset.pack ?? "";
    const isCuratedPack = packId.startsWith(modulePrefix);

    element.classList.remove("scfc-hidden-pack");

    if (!curatedMode) continue;
    if (isGM) continue;
    if (isCuratedPack) continue;

    element.classList.add("scfc-hidden-pack");
  }
});
