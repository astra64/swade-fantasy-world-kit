/**
 * Icon Remapping Macro
 *
 * Scans and remaps icons for world items, actor items, and unlocked compendiums.
 * Useful for keeping icon mappings consistent across compendium iterations.
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
  let packCount = 0;

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

  // Scan unlocked compendiums
  for (const pack of game.packs) {
    if (!pack.locked) {
      for (const item of pack.contents ?? []) {
        const newIcon = remapper(item);
        if (newIcon && newIcon !== item.img) {
          await item.update({ img: newIcon });
          count++;
          packCount++;
        }
      }
    }
  }

  const summary = `${count} item(s) updated (${packCount} in compendiums)`;
  ui.notifications?.info(`Icon remapping complete. ${summary}`);

  new Dialog({
    title: "Icon Remapping Summary",
    content: `<p>${summary}</p>`,
    buttons: {
      close: {
        label: "Close"
      }
    }
  }).render(true);
})();



