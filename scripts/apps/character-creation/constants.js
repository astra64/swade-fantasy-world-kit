/**
 * Character Manager Constants
 * Centralized configuration and mappings
 */

// Skill to attribute mappings
export const SKILL_ATTRIBUTE_MAP = {
  'athletics': 'strength',
  'common-knowledge': 'smarts',
  'notice': 'smarts',
  'persuasion': 'spirit',
  'stealth': 'agility',
  'fighting': 'agility',
  'shooting': 'agility',
  'riding': 'agility',
  'academics': 'smarts',
  'arcane': 'smarts',
  'battle': 'smarts',
  'boating': 'agility',
  'healing': 'smarts',
  'occultism': 'smarts',
  'investigation': 'smarts',
  'lockpicking': 'agility',
  'piloting': 'agility',
  'repair': 'smarts',
  'survival': 'smarts',
  'taunt': 'spirit',
  'faith': 'spirit',
  'intimidation': 'spirit',
  'performance': 'spirit',
  'psionics': 'smarts',
  'swimming': 'strength',
  'throwing': 'strength',
};

// Default attribute structure
export const DEFAULT_ATTRIBUTES = {
  agility: { die: 'd4', advances: 0 },
  smarts: { die: 'd4', advances: 0 },
  spirit: { die: 'd4', advances: 0 },
  strength: { die: 'd4', advances: 0 },
  vigor: { die: 'd4', advances: 0 },
};

// Tab guidance text
export const TAB_GUIDANCE = {
  concept: "What's your character's basic idea? Choose an archetype (like 'Rogue', 'Wizard', 'Ranger') and briefly describe them. This is just flavor—you'll define your actual abilities on the next tabs.",
  ancestry: "Pick your character's ancestry (like Human, Dwarf, Elf). Each ancestry gives you starting bonuses to skills and stats. The bonuses automatically apply to later tabs—don't worry about adding them yourself.",
  hindrances: "Hindrances are flaws or quirks that give you bonus points. Major hindrances are worth 2 points, minor ones worth 1. Pick up to 4 points' worth. For each, choose what bonus you want: a +2 to an attribute, a free edge, extra skill point, or extra money. First-timers should pick 2–3 hindrances to keep things simple.",
  attributes: "You have 5 points to boost your core abilities. Start with d6 in each (your base), then pick which ones matter most to your character. A strong warrior bumps Strength and Vigor; a sneaky rogue boosts Agility and Smarts. Moving a die up one step (d6→d8) costs 1 point. Raising from d12 costs 2 points but has a limit—ask your GM if unsure.",
  skills: "Pick what your character is good at. You have 12 points to spend. Core skills (marked with ★) start free at d4—you just pay to boost them higher. Other skills cost points to use. Each die step up (d4→d6) costs 1 point. Pro tip: Pick 3–4 skills your character uses often; leave the rest. Your ancestry and edges might add free bonuses here too.",
  edges: "Edges are cool special abilities and perks. You get edge points from hindrances and your ancestry (Humans get a bonus edge). Pick abilities that fit your character—a rogue might pick Fast Draw or Luck, a mage picks spellcasting edges. No rush to pick everything on your first try; you can always take more edges with advances as your character grows. Check the prerequisites—some edges require skills or attributes at certain levels.",
  gear: "Pick your starting equipment. You have 300 silver to spend. Drag items from the compendium list on the left into your gear. Don't sweat perfection—you can't break anything here, and you'll pick up more loot in the game. A new character usually grabs one good weapon, armor if available, and handy adventuring gear like rope or a torch. Anything over budget is fine, but the GM might tell you to trim down.",
  summary: "Here's your final character. Review everything—if something looks off, go back to earlier tabs and fix it. The derived stats at the bottom (Pace, Parry, Toughness) are calculated automatically from your choices. Ready? Hit Save to add your character to the world!",
};

// Compendium pack IDs
export const COMPENDIUM_PACKS = {
  ancestries: 'swade-fantasy-world-kit.ancestries-fantasy',
  skills: 'swade-fantasy-world-kit.skills-fantasy',
  edges: 'swade-fantasy-world-kit.edges-fantasy',
  hindrances: 'swade-fantasy-world-kit.hindrances-fantasy',
};

// Budget limits
export const BUDGETS = {
  attributes: 5,
  skills: 12,
  hindrances: 4,
  gear: 300,
};

// Tab names
export const TABS = {
  CONCEPT: 'concept',
  ANCESTRY: 'ancestry',
  HINDRANCES: 'hindrances',
  ATTRIBUTES: 'attributes',
  SKILLS: 'skills',
  EDGES: 'edges',
  GEAR: 'gear',
  SUMMARY: 'summary',
};
