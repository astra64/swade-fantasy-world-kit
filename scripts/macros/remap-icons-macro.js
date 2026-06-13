/**
 * Icon Remapping Macro
 *
 * Scans world items and actor items, remapping old Fantasy Companion icons
 * to game-icons-net equivalents based on configured mappings.
 *
 * Paste this code into a Foundry macro.
 */

(async () => {
  if (!game.user?.isGM) {
    ui.notifications?.error("Only GMs can remap icons.");
    return;
  }

  const remapper = window.swadeFwkIconRemapper;
  if (!remapper) {
    ui.notifications?.error("Icon remapper not loaded. Ensure SWADE Fantasy World Kit module is active and enabled.");
    return;
  }

  let count = 0;

  // Scan world items
  for (const item of game.items ?? []) {
    const newIcon = remapper(item);
    if (newIcon && newIcon !== item.img) {
      await item.update({ img: newIcon });
      count++;
    }
  }

  // Scan actor items
  for (const actor of game.actors ?? []) {
    for (const item of actor.items ?? []) {
      const newIcon = remapper(item);
      if (newIcon && newIcon !== item.img) {
        await item.update({ img: newIcon });
        count++;
      }
    }
  }

  ui.notifications?.info(`Icon remapping complete. ${count} item(s) updated.`);

  new Dialog({
    title: "Icon Remapping Summary",
    content: `<p>${count} item icon(s) successfully remapped to game-icons-net.</p>`,
    buttons: {
      close: {
        label: "Close"
      }
    }
  }).render(true);
})();



