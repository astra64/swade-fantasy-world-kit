/**
 * Icon mapping configuration for remapping system icons to custom game-icons.net variants.
 *
 * Three mapping types:
 * 1. pathMappings - Direct path-based remapping (source icon path → target icon URL)
 * 2. nameMappings - Name-based soft lookup (item name → icon URL) for items sharing default icons
 * 3. fallbackIconMappings - Generic fallback icons by item type
 */

/**
 * Direct icon path remapping.
 * Priority: SWADE system icons → Fantasy Companion icons → game-icons-net equivalents
 *
 * Format: { "source/icon/path.ext": "modules/game-icons-net/blackbackground/icon-name.svg" }
 */
export const pathMappings = {
  // SWADE System Icons (36 mappings to game-icons-net)
  "systems/swade/assets/icons/plain-circle.svg": "modules/game-icons-net/blackbackground/plain-circle.svg",
  "systems/swade/assets/icons/police-badge.svg": "modules/game-icons-net/blackbackground/police-badge.svg",
  "systems/swade/assets/icons/shield.svg": "modules/game-icons-net/blackbackground/shield.svg",
  "systems/swade/assets/icons/skills/airplane.svg": "modules/game-icons-net/blackbackground/airplane.svg",
  "systems/swade/assets/icons/skills/archive-research.svg": "modules/game-icons-net/blackbackground/archive-research.svg",
  "systems/swade/assets/icons/skills/arrest.svg": "modules/game-icons-net/blackbackground/arrest.svg",
  "systems/swade/assets/icons/skills/awareness.svg": "modules/game-icons-net/blackbackground/awareness.svg",
  "systems/swade/assets/icons/skills/battle-gear.svg": "modules/game-icons-net/blackbackground/battle-gear.svg",
  "systems/swade/assets/icons/skills/camping-tent.svg": "modules/game-icons-net/blackbackground/camping-tent.svg",
  "systems/swade/assets/icons/skills/circuitry.svg": "modules/game-icons-net/blackbackground/circuitry.svg",
  "systems/swade/assets/icons/skills/computing.svg": "modules/game-icons-net/blackbackground/computing.svg",
  "systems/swade/assets/icons/skills/confrontation.svg": "modules/game-icons-net/blackbackground/confrontation.svg",
  "systems/swade/assets/icons/skills/convince.svg": "modules/game-icons-net/blackbackground/convince.svg",
  "systems/swade/assets/icons/skills/crosshair.svg": "modules/game-icons-net/blackbackground/crosshair.svg",
  "systems/swade/assets/icons/skills/curled-tentacle.svg": "modules/game-icons-net/blackbackground/curled-tentacle.svg",
  "systems/swade/assets/icons/skills/drama-masks.svg": "modules/game-icons-net/blackbackground/drama-masks.svg",
  "systems/swade/assets/icons/skills/erlenmeyer.svg": "modules/game-icons-net/blackbackground/erlenmeyer.svg",
  "systems/swade/assets/icons/skills/gift-of-knowledge.svg": "modules/game-icons-net/blackbackground/gift-of-knowledge.svg",
  "systems/swade/assets/icons/skills/graduate-cap.svg": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "systems/swade/assets/icons/skills/hidden.svg": "modules/game-icons-net/blackbackground/hidden.svg",
  "systems/swade/assets/icons/skills/jump-across.svg": "modules/game-icons-net/blackbackground/jump-across.svg",
  "systems/swade/assets/icons/skills/lockpicks.svg": "modules/game-icons-net/blackbackground/lockpicks.svg",
  "systems/swade/assets/icons/skills/medical-pack.svg": "modules/game-icons-net/blackbackground/medical-pack.svg",
  "systems/swade/assets/icons/skills/meditation.svg": "modules/game-icons-net/blackbackground/meditation.svg",
  "systems/swade/assets/icons/skills/prayer.svg": "modules/game-icons-net/blackbackground/prayer.svg",
  "systems/swade/assets/icons/skills/psychic-waves.svg": "modules/game-icons-net/blackbackground/psychic-waves.svg",
  "systems/swade/assets/icons/skills/punch.svg": "modules/game-icons-net/blackbackground/punch.svg",
  "systems/swade/assets/icons/skills/rolling-dices.svg": "modules/game-icons-net/blackbackground/rolling-dices.svg",
  "systems/swade/assets/icons/skills/saddle.svg": "modules/game-icons-net/blackbackground/saddle.svg",
  "systems/swade/assets/icons/skills/sailboat.svg": "modules/game-icons-net/blackbackground/sailboat.svg",
  "systems/swade/assets/icons/skills/spanner.svg": "modules/game-icons-net/blackbackground/spanner.svg",
  "systems/swade/assets/icons/skills/spell-book.svg": "modules/game-icons-net/blackbackground/spell-book.svg",
  "systems/swade/assets/icons/skills/steering-wheel.svg": "modules/game-icons-net/blackbackground/steering-wheel.svg",
  "systems/swade/assets/icons/skills/talk.svg": "modules/game-icons-net/blackbackground/talk.svg",
  "systems/swade/assets/icons/skills/uncertainty.svg": "modules/game-icons-net/blackbackground/uncertainty.svg",

  // SWADE Fantasy Companion Icons (66 mappings - preferring SWADE system icon targets)
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Academics.webp": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Academics_v2.webp": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Academics_v3.webp": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Athletics.webp": "modules/game-icons-net/blackbackground/jump-across.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Armor.webp": "modules/game-icons-net/blackbackground/acid-shield.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Battle.webp": "modules/game-icons-net/blackbackground/confrontation.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Boating.webp": "modules/game-icons-net/blackbackground/sailboat.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_CommonKnowledge.webp": "modules/game-icons-net/blackbackground/gift-of-knowledge.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Driving.webp": "modules/game-icons-net/blackbackground/steering-wheel.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Edge.webp": "modules/game-icons-net/blackbackground/crystal-shine.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Electronics.webp": "modules/game-icons-net/blackbackground/circuitry.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Electronics_v2.webp": "modules/game-icons-net/blackbackground/circuitry.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Faith.webp": "modules/game-icons-net/blackbackground/prayer.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Faith_v1.webp": "modules/game-icons-net/blackbackground/prayer.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Faith_v2.webp": "modules/game-icons-net/blackbackground/prayer.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Fighting.webp": "modules/game-icons-net/blackbackground/punch.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Focus.webp": "modules/game-icons-net/blackbackground/awareness.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Focus_v1.webp": "modules/game-icons-net/blackbackground/awareness.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Gambling.webp": "modules/game-icons-net/blackbackground/rolling-dices.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Gear.webp": "modules/game-icons-net/blackbackground/cog-lock.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Hacking.webp": "modules/game-icons-net/blackbackground/circuitry.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Healing.webp": "modules/game-icons-net/blackbackground/medical-pack.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Healing_v1.webp": "modules/game-icons-net/blackbackground/medical-pack.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Hindrance.webp": "modules/game-icons-net/blackbackground/broken-arrow.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Intimidation.webp": "modules/game-icons-net/blackbackground/confrontation.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Language.webp": "modules/game-icons-net/blackbackground/talk.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_MagicItem.webp": "modules/game-icons-net/blackbackground/engagement-ring.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Notice.webp": "modules/game-icons-net/blackbackground/awareness.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Occult.webp": "modules/game-icons-net/blackbackground/psychic-waves.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Occult_v1.webp": "modules/game-icons-net/blackbackground/psychic-waves.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Performance.webp": "modules/game-icons-net/blackbackground/drama-masks.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Performance_v1.webp": "modules/game-icons-net/blackbackground/drama-masks.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Persuasion.webp": "modules/game-icons-net/blackbackground/talk.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Piloting.webp": "modules/game-icons-net/blackbackground/airplane.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Piloting_v1.webp": "modules/game-icons-net/blackbackground/airplane.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Piloting_v2.webp": "modules/game-icons-net/blackbackground/airplane.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Power.webp": "modules/game-icons-net/blackbackground/chain-lightning.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Power_v1.webp": "modules/game-icons-net/blackbackground/chain-lightning.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Psionics.webp": "modules/game-icons-net/blackbackground/psychic-waves.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Psionics_v1.webp": "modules/game-icons-net/blackbackground/psychic-waves.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Repair.webp": "modules/game-icons-net/blackbackground/spanner.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Research.webp": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Research_v1.webp": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Research_v2.webp": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Riding.webp": "modules/game-icons-net/blackbackground/saddle.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Science.webp": "modules/game-icons-net/blackbackground/erlenmeyer.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Science_v1.webp": "modules/game-icons-net/blackbackground/erlenmeyer.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Shield.webp": "modules/game-icons-net/blackbackground/shield.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Shield_v1.webp": "modules/game-icons-net/blackbackground/shield.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Shooting.webp": "modules/game-icons-net/blackbackground/crosshair.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Shooting_v1.webp": "modules/game-icons-net/blackbackground/crosshair.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_SpecialAbility.webp": "modules/game-icons-net/blackbackground/crystal-shine.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Spellcasting.webp": "modules/game-icons-net/blackbackground/spell-book.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Spellcasting_v1.webp": "modules/game-icons-net/blackbackground/spell-book.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Spellcasting_v2.webp": "modules/game-icons-net/blackbackground/spell-book.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Stealth.webp": "modules/game-icons-net/blackbackground/hidden.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Stealth_v1.webp": "modules/game-icons-net/blackbackground/hidden.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Survival.webp": "modules/game-icons-net/blackbackground/camping-tent.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Survival_v1.webp": "modules/game-icons-net/blackbackground/camping-tent.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Taunt.webp": "modules/game-icons-net/blackbackground/confrontation.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Thievery.webp": "modules/game-icons-net/blackbackground/lockpicks.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Thievery_v1.webp": "modules/game-icons-net/blackbackground/lockpicks.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Thievery_v2.webp": "modules/game-icons-net/blackbackground/lockpicks.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Trade.webp": "modules/game-icons-net/blackbackground/spanner.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Trade_v1.webp": "modules/game-icons-net/blackbackground/spanner.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Trade_v2.webp": "modules/game-icons-net/blackbackground/spanner.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Trade_v3.webp": "modules/game-icons-net/blackbackground/spanner.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Untrained.webp": "modules/game-icons-net/blackbackground/help.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Vudoo.webp": "modules/game-icons-net/blackbackground/voodoo-doll.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_Weapon.webp": "modules/game-icons-net/blackbackground/punch.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_WeirdScience.webp": "modules/game-icons-net/blackbackground/computing.svg",
  "modules/swade-fantasy-companion/assets/icons/Fantasy_Icons_WeirdScience_v1.webp": "modules/game-icons-net/blackbackground/computing.svg",
};

/**
 * Name-based soft lookup for items sharing default icons.
 * Used when skills/edges/hindrances/powers/ancestries have the same placeholder icon but you want variation by name.
 *
 * Format: { "ItemType": { "itemName": "modules/game-icons-net/blackbackground/icon-name.svg" } }
 */
export const nameMappings = {
  "Skill": {
    "piloting": "modules/game-icons-net/blackbackground/airplane.svg",
    "driving": "modules/game-icons-net/blackbackground/steering-wheel.svg",
    "riding": "modules/game-icons-net/blackbackground/saddle.svg",
    "boating": "modules/game-icons-net/blackbackground/sailboat.svg",
    "academics": "modules/game-icons-net/blackbackground/graduate-cap.svg",
    "research": "modules/game-icons-net/blackbackground/graduate-cap.svg",
    "common knowledge": "modules/game-icons-net/blackbackground/gift-of-knowledge.svg",
    "science": "modules/game-icons-net/blackbackground/erlenmeyer.svg",
    "medicine": "modules/game-icons-net/blackbackground/medical-pack.svg",
    "healing": "modules/game-icons-net/blackbackground/medical-pack.svg",
    "occult": "modules/game-icons-net/blackbackground/psychic-waves.svg",
    "psionics": "modules/game-icons-net/blackbackground/psychic-waves.svg",
    "spellcasting": "modules/game-icons-net/blackbackground/spell-book.svg",
    "faith": "modules/game-icons-net/blackbackground/prayer.svg",
    "electronics": "modules/game-icons-net/blackbackground/circuitry.svg",
    "hacking": "modules/game-icons-net/blackbackground/circuitry.svg",
    "weird science": "modules/game-icons-net/blackbackground/computing.svg",
    "repair": "modules/game-icons-net/blackbackground/spanner.svg",
    "lockpicking": "modules/game-icons-net/blackbackground/lockpicks.svg",
    "thievery": "modules/game-icons-net/blackbackground/lockpicks.svg",
    "stealth": "modules/game-icons-net/blackbackground/hidden.svg",
    "notice": "modules/game-icons-net/blackbackground/awareness.svg",
    "awareness": "modules/game-icons-net/blackbackground/awareness.svg",
    "survival": "modules/game-icons-net/blackbackground/camping-tent.svg",
    "investigation": "modules/game-icons-net/blackbackground/hidden.svg",
    "battle": "modules/game-icons-net/blackbackground/confrontation.svg",
    "fighting": "modules/game-icons-net/blackbackground/punch.svg",
    "shooting": "modules/game-icons-net/blackbackground/crosshair.svg",
    "athletics": "modules/game-icons-net/blackbackground/jump-across.svg",
    "performance": "modules/game-icons-net/blackbackground/drama-masks.svg",
    "persuasion": "modules/game-icons-net/blackbackground/talk.svg",
    "taunt": "modules/game-icons-net/blackbackground/confrontation.svg",
    "intimidation": "modules/game-icons-net/blackbackground/confrontation.svg",
    "language": "modules/game-icons-net/blackbackground/talk.svg",
    "gambling": "modules/game-icons-net/blackbackground/rolling-dices.svg",
    "meditation": "modules/game-icons-net/blackbackground/meditation.svg"
  }
};

/**
 * Generic fallback icons for unmapped items by type.
 * Applied as a final fallback if both pathMappings and nameMappings fail to match.
 */
export const fallbackIconMappings = {
  "Skill": "modules/game-icons-net/blackbackground/graduate-cap.svg",
  "Edge": "modules/game-icons-net/blackbackground/crystal-shine.svg",
  "Hindrance": "modules/game-icons-net/blackbackground/uncertainty.svg",
  "Power": "modules/game-icons-net/blackbackground/chain-lightning.svg",
  "Ancestry": "modules/game-icons-net/blackbackground/curled-tentacle.svg"
};

