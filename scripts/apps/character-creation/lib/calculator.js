/**
 * Character Calculator - Skill, edge, and advancement math
 *
 * Isolated utilities for stat calculations.
 * No UI dependencies. No compendium coupling.
 * Handles SWADE character creation and advancement mechanics.
 */

/**
 * Die type progression for attributes and skills in SWADE.
 * Maps die value to numeric level for calculations.
 */
const DIE_VALUES = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
};

/**
 * The 5 core skills that every character starts with at d4 for free.
 * These cannot be lowered below d4 and cost 0 until raised above d4.
 */
export const FREE_CORE_SKILLS = [
  'athletics',
  'common-knowledge',
  'notice',
  'persuasion',
  'stealth',
];

/**
 * Check if a skill is one of the 5 free core skills.
 * Accepts either display form ("Common Knowledge") or slug form ("common-knowledge").
 * @param {string} skillName - Skill name
 * @returns {boolean} True if skill is a free core skill
 */
export function isFreeCoreSkill(skillName) {
  if (!skillName) return false;
  const normalized = skillName.toLowerCase().trim().replace(/\s+/g, '-');
  return FREE_CORE_SKILLS.includes(normalized);
}

/** Base Pace for every SWADE character before edge/hindrance modifiers (e.g. Fleet-Footed, Slow). */
const BASE_PACE = 6;

/**
 * Sum any `system.pace` Active Effect changes found across a list of items (ancestry, its
 * granted child items, selected edges, selected hindrances). Same scanning pattern as
 * getAncestryAttributeBonuses, generalized to a flat numeric total rather than a per-attribute
 * map since Pace has no sub-fields to track.
 *
 * @param {Array} items - Full item documents (or plain objects with an `effects` collection)
 * @returns {number} Total Pace modifier (can be negative, e.g. Slow)
 */
export function calculatePaceModifier(items = []) {
  let modifier = 0;

  for (const item of items) {
    if (!item) continue;

    let effectsArray = [];
    if (Array.isArray(item.effects)) {
      effectsArray = item.effects;
    } else if (item.effects && typeof item.effects[Symbol.iterator] === 'function') {
      try {
        effectsArray = Array.from(item.effects);
      } catch (e) {
        // Continue if conversion fails
      }
    }

    for (const effect of effectsArray) {
      if (!Array.isArray(effect.changes)) continue;
      for (const change of effect.changes) {
        if (change.key === 'system.pace' || change.key === 'system.pace.value') {
          const value = Number(change.value);
          if (!Number.isNaN(value)) modifier += value;
        }
      }
    }
  }

  return modifier;
}

/**
 * Calculate derived stats from character attributes and skills.
 * Returns object with Pace, Parry, and Toughness (SWADE current edition).
 *
 * @param {Object} character - Character object with attributes and skills
 * @param {Object} [options]
 * @param {number} [options.armorBonus] - Toughness bonus from selected armor gear
 * @param {number} [options.paceModifier] - Net Pace modifier from ancestry/edges/hindrances
 * @returns {Object} Derived stats {pace, parry, toughness}
 */
export function calculateDerivedStats(character, { armorBonus = 0, paceModifier = 0 } = {}) {
  const stats = {};

  try {
    stats.pace = BASE_PACE + (paceModifier || 0);

    // Parry: Half fighting skill die + 2
    // Look for skill by name (case-insensitive, with or without dashes)
    let fightingSkill = null;
    if (character.skills) {
      for (const [skillName, skillData] of Object.entries(character.skills)) {
        if (skillName.toLowerCase() === 'fighting' || skillName.toLowerCase().includes('fighting')) {
          fightingSkill = skillData;
          break;
        }
      }
    }

    if (fightingSkill) {
      const dieValue = DIE_VALUES[fightingSkill.die] ?? 4;
      stats.parry = Math.floor(dieValue / 2) + 2;
    } else {
      stats.parry = 2; // Default if no fighting skill
    }

    // Toughness: Base 2 + armor bonus + half vigor die
    const vigorDie = character.attributes?.vigor?.die ?? "d4";
    const vigorValue = DIE_VALUES[vigorDie] ?? 4;
    const vigorBonus = Math.floor(vigorValue / 2);
    stats.toughness = 2 + vigorBonus + (armorBonus || 0);

  } catch (error) {
    console.warn("[Character Creation] Failed to calculate derived stats:", error);
  }

  return stats;
}

/**
 * Check if a character meets edge prerequisites.
 * 
 * NOTE: Full prerequisite checking (skill ranks, edge combinations, etc.)
 * is deferred to v0.6.2+ enhancement phase. 
 * This placeholder always returns true for v0.6.2 scope.
 * 
 * @param {Object} edge - Edge item object
 * @param {Object} character - Character object
 * @returns {boolean} True if character can take this edge
 */
export function validateEdgePrerequisites(edge, character) {
  // Placeholder: No prerequisite validation in v0.6.2 (deferred)
  // Future: Check requirements: {minRank, skills, edges, attributes, etc.}
  return true;
}

/**
 * Advancement tab — SWADE's real ADVANCE_TYPE enum values (from systems/swade/swade.js),
 * used when writing character.advances[] back to actor.system.advances.list. Kept as our
 * own string keys internally (easier to bind in templates/handlers) and mapped to/from this
 * enum only at the actor boundary (detection on open, save on write).
 */
export const ADVANCE_TYPE_ENUM = {
  edge: 0,
  singleSkill: 1,
  twoSkills: 2,
  attribute: 3,
  hindrance: 4,
};

export const ADVANCE_TYPE_ENUM_REVERSE = {
  0: 'edge',
  1: 'singleSkill',
  2: 'twoSkills',
  3: 'attribute',
  4: 'hindrance',
};

/** SWADE Rank tiers, in order — index = how many rank-ups have been reached. */
export const RANK_NAMES = ['Novice', 'Seasoned', 'Veteran', 'Heroic', 'Legendary'];

/**
 * Count character.advances[] entries by type. Advances are fungible within a type — there's
 * no per-advance target/ledger, just a count — so this is the sole input to every advancement
 * budget bonus below.
 *
 * @param {Object} character - Character object with an `advances` array
 * @returns {Object} {edge, singleSkill, twoSkills, attribute, hindrance}
 */
export function calculateAdvanceTypeCounts(character) {
  const counts = { edge: 0, singleSkill: 0, twoSkills: 0, attribute: 0, hindrance: 0 };
  for (const advance of character.advances || []) {
    if (advance?.type in counts) counts[advance.type] += 1;
  }
  return counts;
}

/** Each Edge-type advance grants 1 bonus edge point, same pool as hindrance/ancestry bonuses. */
export function calculateBonusEdgePointsFromAdvances(character) {
  return calculateAdvanceTypeCounts(character).edge;
}

/**
 * Each Two-Skills or One-Skill advance grants 2 bonus skill points — both types resolve to
 * the same value under this app's existing skill-cost formula (2 steps at/below the linked
 * attribute, or 1 step above it, both cost 2 total) — but are kept as distinct advance types
 * in the UI to mirror the rules as written.
 */
export function calculateBonusSkillPointsFromAdvances(character) {
  const counts = calculateAdvanceTypeCounts(character);
  return (counts.singleSkill + counts.twoSkills) * 2;
}

/** Each Attribute-type advance grants 1 bonus attribute point. */
export function calculateBonusAttributePointsFromAdvances(character) {
  return calculateAdvanceTypeCounts(character).attribute;
}

/**
 * Each Hindrance-buyoff advance grants 1 bonus perk-point slot — compensating for the fact
 * that removing a hindrance elsewhere reduces the Hindrances tab's live-derived perk-point
 * count (which isn't tied to any specific hindrance). This can grant a perk point beyond what
 * the character's current hindrance total would otherwise allow, an accepted trade-off.
 */
export function calculateBonusPerkPointsFromAdvances(character) {
  return calculateAdvanceTypeCounts(character).hindrance;
}

/**
 * Total advances taken (all types) — this is what actually drives Rank in SWADE, regardless
 * of which advance type each one was.
 */
export function calculateTotalAdvanceCount(character) {
  return (character.advances || []).length;
}

/**
 * Derive a Rank tier index (0-4) from a 1-based advance number, matching SWADE's own
 * `getRankFromAdvance()` banding exactly (confirmed from systems/swade/swade.js): Novice
 * covers advances 1-3 (only 3, not 4 — SWADE's own `sort` field starts at 1, so the Novice
 * band is whatever's ≤3), then Seasoned 4-7, Veteran 8-11, Heroic 12-15, Legendary 16+.
 *
 * @param {number} advanceNumber - 1-based position (1st advance, 2nd advance, ...)
 * @returns {number} Rank tier index (0-4)
 */
export function getRankIndexFromAdvanceNumber(advanceNumber) {
  if (advanceNumber <= 3) return 0;
  if (advanceNumber <= 7) return 1;
  if (advanceNumber <= 11) return 2;
  if (advanceNumber <= 15) return 3;
  return 4;
}

/**
 * Derive the character's current Rank from total advance count, using the same banding as
 * SWADE's own advances.rank derivation (see getRankIndexFromAdvanceNumber).
 *
 * @param {Object} character - Character object with an `advances` array
 * @returns {{index: number, name: string}} Rank tier index (0-4) and display name
 */
export function getCharacterRank(character) {
  const count = calculateTotalAdvanceCount(character);
  const index = getRankIndexFromAdvanceNumber(count);
  return { index, name: RANK_NAMES[index] };
}

/**
 * Group character.advances[] by the Rank tier each was taken at, for the Advancement tab's
 * display — same per-advance-number banding as getRankIndexFromAdvanceNumber (Novice gets
 * only 3, then 4 apiece). Only tiers that actually contain an advance are returned (no empty
 * "Legendary" header on a 2-advance character), in Rank order, each advance keeping its
 * original array index (needed so edit/remove buttons still target the right entry in
 * character.advances).
 *
 * @param {Object} character - Character object with an `advances` array
 * @returns {Array<{rankIndex: number, rankName: string, advances: Array}>}
 */
export function groupAdvancesByRank(character) {
  const advances = character.advances || [];
  const groups = [];

  advances.forEach((advance, index) => {
    const rankIndex = getRankIndexFromAdvanceNumber(index + 1);
    let group = groups[groups.length - 1];
    if (!group || group.rankIndex !== rankIndex) {
      group = { rankIndex, rankName: RANK_NAMES[rankIndex], advances: [] };
      groups.push(group);
    }
    group.advances.push({ ...advance, index });
  });

  return groups;
}

/**
 * Informational-only check for the real "Attributes can only be raised once per Rank" rule.
 * Allowed count is approximated as (rank tier index + 1) — one Attribute advance per Rank
 * tier reached so far, including Novice. Never blocks Save; just returns a message to display,
 * or null if within the expected count.
 *
 * @param {Object} character - Character object with an `advances` array
 * @returns {string|null} Warning message, or null if not over the once-per-Rank guideline
 */
export function getAttributeAdvanceWarning(character) {
  const counts = calculateAdvanceTypeCounts(character);
  const rank = getCharacterRank(character);
  const allowed = rank.index + 1;
  if (counts.attribute <= allowed) return null;

  return `You've taken ${counts.attribute} Attribute advance${counts.attribute === 1 ? '' : 's'}, but Attributes can only be raised once per Rank.`;
}

/**
 * Get available skills filtered by linked attribute.
 * Used by character creation form to display appropriate skill options.
 * 
 * @param {Array} allSkills - Array of skill items from compendium
 * @param {string} [linkedAttribute] - Optional filter by linked attribute
 * @returns {Array} Filtered skills array
 */
export function filterSkillsByAttribute(allSkills, linkedAttribute = null) {
  if (!Array.isArray(allSkills)) return [];
  
  if (!linkedAttribute) return allSkills;
  
  // Placeholder: Filter by linked attribute if skill item stores this data
  // For now, return all (filtering via compendium metadata deferred)
  return allSkills;
}

/**
 * Calculate the point cost to increase a skill to a given die value.
 *
 * SWADE Creation Rules:
 * - Core skills (Athletics, Common Knowledge, Notice, Persuasion, Stealth) start free at d4
 * - Non-core skills cost 1 point to add at d4
 * - Cost to increase a skill: 1pt per die step up to linked attribute, 2pts per step above
 *
 * @param {string} skillName - Skill name (for checking if core skill)
 * @param {string} targetDie - Target die value (d4, d6, etc.)
 * @param {string} linkedAttributeDie - Linked attribute die value
 * @param {string} [currentSkillDie] - Current skill die (defaults to d4)
 * @returns {number} Total points needed to reach targetDie
 */
export function calculateSkillCost(skillName, targetDie, linkedAttributeDie, currentSkillDie = "d4") {
  const targetValue = DIE_VALUES[targetDie] ?? 4;
  const currentValue = DIE_VALUES[currentSkillDie] ?? 4;
  const attributeValue = DIE_VALUES[linkedAttributeDie] ?? 4;
  const isCore = isFreeCoreSkill(skillName);

  // Core skills free at d4 - only cost if raised above d4
  if (isCore && targetValue === 4) {
    return 0; // Free at d4
  }

  // Non-core skills cost 1 point to add at d4
  if (!isCore && targetValue === 4) {
    return 1; // Cost to add the skill
  }

  // If already at target value, no cost
  if (currentValue === targetValue) {
    return 0;
  }

  let totalCost = 0;

  // Non-core skills cost 1 point to add (when raising above d4)
  if (!isCore && currentValue === 4 && targetValue > 4) {
    totalCost += 1;
  }

  // Sum cost for each step from current to target
  let stepValue = currentValue;
  while (stepValue < targetValue) {
    const nextValue = stepValue + 2; // Each step is +2 on die values (d4→d6→d8, etc.)

    // Cost per step: 1pt if next die ≤ attribute, 2pts if next die > attribute
    const stepCost = nextValue <= attributeValue ? 1 : 2;
    totalCost += stepCost;

    stepValue = nextValue;
  }

  return totalCost;
}

/**
 * Build a per-skill breakdown of skill point cost, for both totaling and debugging.
 * Single source of truth for calculateTotalSkillPoints() below.
 *
 * @param {Object} character - Character object with skills
 * @param {Object} skillCompendiumData - Compendium data with skill metadata (for linked attributes)
 * @returns {Array} Array of {uuid, name, die, linkedAttrDie, isCore, fromAncestry, grantedDie, cost}
 */
export function getSkillPointBreakdown(character, skillCompendiumData = {}) {
  const breakdown = [];

  if (!character.skills || typeof character.skills !== 'object') {
    return breakdown;
  }

  for (const [skillUuid, skillData] of Object.entries(character.skills)) {
    if (!skillData.die) continue;

    // Find skill metadata to get linked attribute and name (character.skills entries
    // don't reliably carry their own name, so fall back to the compendium map, then to
    // whatever the skill's own item data recorded when it isn't in the compendium at all)
    const skillMeta = skillCompendiumData[skillUuid];
    const linkedAttribute = skillMeta?.linkedAttribute || skillData.attribute;
    const linkedAttrDie = linkedAttribute
      ? character.attributes?.[linkedAttribute]?.die
      : "d4";
    const skillName = skillData.name || skillMeta?.name || "";

    // Unskilled Attempt is a catch-all every actor has; it's never player-selected
    // or changed, so it never contributes to the skill point budget.
    if (skillName.toLowerCase() === 'unskilled attempt') continue;

    const isCore = isFreeCoreSkill(skillName);

    let cost;
    if (skillData.fromAncestry) {
      // Skills granted by ancestry are free up to their granted die tier only;
      // increases above that tier still cost points normally.
      const grantedDie = skillData.grantedDie || skillData.die;
      const costToGranted = calculateSkillCost(skillName, grantedDie, linkedAttrDie, "d4");
      const costToTarget = calculateSkillCost(skillName, skillData.die, linkedAttrDie, "d4");
      cost = Math.max(0, costToTarget - costToGranted);
    } else {
      cost = calculateSkillCost(skillName, skillData.die, linkedAttrDie, "d4");
    }

    breakdown.push({
      uuid: skillUuid,
      name: skillName || '(unknown skill name)',
      die: skillData.die,
      linkedAttrDie,
      isCore,
      fromAncestry: !!skillData.fromAncestry,
      grantedDie: skillData.grantedDie || null,
      cost,
    });
  }

  return breakdown;
}

/**
 * Calculate total skill points spent in character creation.
 *
 * @param {Object} character - Character object with skills
 * @param {Object} skillCompendiumData - Compendium data with skill metadata (for linked attributes)
 * @returns {number} Total points spent on skills
 */
export function calculateTotalSkillPoints(character, skillCompendiumData = {}) {
  return getSkillPointBreakdown(character, skillCompendiumData).reduce((sum, s) => sum + s.cost, 0);
}

/**
 * Calculate total attribute points spent.
 *
 * @param {Object} character - Character object with attributes
 * @returns {number} Total points spent on attributes (each step above d4 = 1pt)
 */
export function calculateTotalAttributePoints(character) {
  let totalSpent = 0;

  if (!character.attributes || typeof character.attributes !== 'object') {
    return 0;
  }

  for (const [attrName, attrData] of Object.entries(character.attributes)) {
    const attrValue = DIE_VALUES[attrData.die] ?? 4;
    // Each step above d4 costs 1 point (d6=1, d8=2, d10=3, d12=4)
    // Dice values increase by 2: d4(4), d6(6), d8(8), d10(10), d12(12)
    if (attrValue > 4) {
      const steps = (attrValue - 4) / 2;
      totalSpent += steps;
    }
  }

  return totalSpent;
}

/**
 * Get remaining attribute points for character creation.
 * 
 * @param {Object} character - Character object
 * @returns {number} Remaining points (0-5)
 */
export function getRemainingAttributePoints(character) {
  const spent = calculateTotalAttributePoints(character);
  return Math.max(0, 5 - spent);
}

/**
 * Get remaining skill points for character creation.
 *
 * @param {Object} character - Character object
 * @param {Object} skillCompendiumData - Compendium data with skill metadata
 * @returns {number} Remaining points (0-12)
 */
export function getRemainingSkillPoints(character, skillCompendiumData = {}) {
  const spent = calculateTotalSkillPoints(character, skillCompendiumData);
  return Math.max(0, 12 - spent);
}

/**
 * Calculate total hindrance points spent.
 * Sums points from all selected hindrances (Major = 2pts, Minor = 1pt).
 *
 * @param {Object} character - Character object with hindrances
 * @returns {number} Total points spent on hindrances
 */
export function calculateTotalHindrancePoints(character) {
  let totalSpent = 0;

  if (!character.hindrances || typeof character.hindrances !== 'object') {
    return 0;
  }

  for (const [uuid, hindranceData] of Object.entries(character.hindrances)) {
    totalSpent += hindranceData.points ?? 0;
  }

  return totalSpent;
}

/**
 * Get remaining hindrance points for character creation.
 *
 * @param {Object} character - Character object
 * @returns {number} Remaining points (0-4)
 */
export function getRemainingHindrancePoints(character) {
  const spent = calculateTotalHindrancePoints(character);
  return Math.max(0, 4 - spent);
}

/**
 * Validate that total hindrance points do not exceed budget.
 *
 * @param {Object} character - Character object
 * @returns {boolean} True if valid (≤4 points)
 */
export function validateHindranceTotalPoints(character) {
  const spent = calculateTotalHindrancePoints(character);
  return spent <= 4;
}

/**
 * Get available perk points from hindrances, plus any bonus perk-point slots granted by
 * Hindrance-buyoff advances (see calculateBonusPerkPointsFromAdvances) — those bonus slots
 * are added on top of the 4-point hindrance cap, not folded into it, since they're a
 * deliberate exception rather than part of the hindrance-point budget itself.
 *
 * @param {Object} character - Character object
 * @param {number} [bonusPerkPoints] - Extra perk-point slots from Hindrance-buyoff advances
 * @returns {number} Available perk points
 */
export function getAvailablePerkPoints(character, bonusPerkPoints = 0) {
  const hindrancePoints = calculateTotalHindrancePoints(character);
  return Math.min(hindrancePoints, 4) + bonusPerkPoints;
}

/**
 * Generate perk point allocation slots based on total hindrance points (capped at 4), plus
 * any bonus slots from Hindrance-buyoff advances (uncapped — see getAvailablePerkPoints).
 *
 * @param {Object} character - Character object with hindrances and perkPointAllocations
 * @param {number} [bonusPerkPoints] - Extra perk-point slots from Hindrance-buyoff advances
 * @returns {Array} Array of slot objects: { pointValue, selected }
 */
export function generatePerkSlots(character, bonusPerkPoints = 0) {
  const hindrancePoints = calculateTotalHindrancePoints(character);
  const availablePerkPoints = Math.min(hindrancePoints, 4) + bonusPerkPoints;
  const existingSlots = character.perkPointAllocations || [];

  const slots = [];
  let pointsRemaining = availablePerkPoints;

  while (pointsRemaining > 0) {
    // Get existing slot data if available, or create new
    const slotIndex = slots.length;
    const existingSlot = existingSlots[slotIndex];

    // Determine pointValue for this slot
    let pointValue = 1;

    // If previous slot selected a 2-point allocation, this slot is consumed (hidden)
    const prevSlot = slots[slotIndex - 1];
    if (prevSlot && ['attribute-boost', 'edge'].includes(prevSlot.selected)) {
      // Previous slot used 2 points, skip this one
      pointsRemaining -= 1;
      continue;
    }

    // Otherwise, use as many points as available (cap at 2 for this slot)
    pointValue = Math.min(2, pointsRemaining);
    pointsRemaining -= pointValue;

    slots.push({
      pointValue,
      selected: existingSlot?.selected || null,
      index: slotIndex
    });
  }

  return slots;
}

/**
 * Check if a perk point allocation slot should be visible in the UI.
 * Slots are hidden if the previous slot selected a 2-point allocation.
 *
 * @param {Array} slots - Array of slot objects
 * @param {number} index - Slot index to check
 * @returns {boolean} True if slot should be visible
 */
export function isPerkSlotVisible(slots, index) {
  if (index === 0) return true;  // First slot always visible

  const prevSlot = slots[index - 1];
  if (!prevSlot) return false;

  // If previous slot selected a 2-point allocation, this slot is consumed/hidden
  return !(['attribute-boost', 'edge'].includes(prevSlot.selected));
}

/**
 * Get available edge points granted by hindrance perk allocations.
 * Each perk slot with "edge" selected grants 1 edge point.
 *
 * @param {Object} character - Character object with perkPointAllocations
 * @returns {number} Available edge points
 */
export function calculateAvailableEdgePoints(character) {
  const allocations = character.perkPointAllocations || [];
  return allocations.filter((a) => a?.selected === 'edge').length;
}

/**
 * Get bonus attribute points granted by hindrance perk allocations.
 * Each perk slot with "attribute-boost" selected grants 1 extra attribute point.
 *
 * @param {Object} character - Character object with perkPointAllocations
 * @returns {number} Bonus attribute points
 */
export function calculateBonusAttributePoints(character) {
  const allocations = character.perkPointAllocations || [];
  return allocations.filter((a) => a?.selected === 'attribute-boost').length;
}

/**
 * Get bonus skill points granted by hindrance perk allocations.
 * Each perk slot with "skill-point" selected grants 1 extra skill point.
 *
 * @param {Object} character - Character object with perkPointAllocations
 * @returns {number} Bonus skill points
 */
export function calculateBonusSkillPoints(character) {
  const allocations = character.perkPointAllocations || [];
  return allocations.filter((a) => a?.selected === 'skill-point').length;
}

/**
 * Count ancestral abilities that grant a free Edge at character creation (e.g. Humans'
 * "Adaptable"), matched by name rather than compendium-specific data. This is setting/
 * compendium-agnostic on purpose — the same ability name is reused across virtually every
 * SWADE setting book, and the configurable name list (world setting) covers the rest.
 *
 * @param {Array} ancestralAbilities - Granted child items from the selected ancestry
 * @param {Array<string>} bonusAbilityNames - Ability names (from settings) that grant a free Edge
 * @returns {number} Bonus edge points granted by ancestry
 */
export function calculateAncestryBonusEdgePoints(ancestralAbilities = [], bonusAbilityNames = []) {
  const normalizedNames = bonusAbilityNames
    .map((n) => n.toLowerCase().trim())
    .filter(Boolean);

  if (!normalizedNames.length || !Array.isArray(ancestralAbilities)) {
    return 0;
  }

  // Match as a whole word/segment rather than exact equality — ability items are commonly
  // named "<Ancestry>-<Ability>" (e.g. "Humans-Adaptable") to disambiguate in a flat
  // compendium list, so the configured name won't equal the full item name.
  return ancestralAbilities.filter((item) => {
    const itemName = (item?.name || '').toLowerCase().trim();
    if (!itemName) return false;
    return normalizedNames.some((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(itemName));
  }).length;
}

/**
 * Calculate how many edges the character has selected.
 *
 * @param {Object} character - Character object with edges
 * @returns {number} Number of selected edges
 */
export function calculateUsedEdgePoints(character) {
  if (!character.edges || typeof character.edges !== 'object') return 0;
  return Object.keys(character.edges).length;
}

/**
 * Check whether the character's current Strength is below an item's minimum Strength
 * requirement (weapons/armor). SWADE's actual penalty for being under minStr is a -1 die
 * step on the relevant roll, not "can't use it" — so this is informational only, matching
 * how edge prerequisites are shown (non-blocking hint), not a hard block on adding the item.
 *
 * @param {Object} character - Character object with attributes
 * @param {string|null} minStrDie - Item's minimum Strength die (e.g. "d8"), or null/falsy if none
 * @returns {boolean} True if the character's Strength die is below minStrDie
 */
export function isUnderMinStrength(character, minStrDie) {
  if (!minStrDie) return false;
  const strengthDie = character?.attributes?.strength?.die ?? 'd4';
  return (DIE_VALUES[strengthDie] ?? 4) < (DIE_VALUES[minStrDie] ?? 4);
}

/**
 * Calculate total gear cost (price × quantity, summed across all selected gear).
 *
 * @param {Object} character - Character object with gear
 * @returns {number} Total silver spent on gear
 */
export function calculateGearCost(character) {
  if (!character.gear || typeof character.gear !== 'object') return 0;

  return Object.values(character.gear).reduce((sum, item) => {
    const price = item.price ?? 0;
    const quantity = item.quantity ?? 1;
    return sum + price * quantity;
  }, 0);
}

/**
 * Get the count of hindrance perk-allocation slots that chose "Extra Funds".
 * Each allocated point grants a bonus equal to twice the setting's starting currency.
 *
 * @param {Object} character - Character object with perkPointAllocations
 * @returns {number} Count of "Extra Funds" perk allocations
 */
export function calculateExtraFundsBonusCount(character) {
  const allocations = character.perkPointAllocations || [];
  return allocations.filter((a) => a?.selected === 'extra-funds').length;
}

/**
 * Parse the `richFundsMultipliers` world setting ("Rich:3,Filthy Rich:5") into a lookup array.
 *
 * @param {string} settingValue - Comma-separated "Name:multiplier" pairs
 * @returns {Array<{name: string, multiplier: number}>}
 */
export function parseRichFundsMultipliers(settingValue) {
  if (!settingValue) return [];
  return settingValue
    .split(',')
    .map((pair) => {
      const [name, multiplier] = pair.split(':').map((s) => s?.trim());
      return { name, multiplier: Number(multiplier) || 1 };
    })
    .filter((entry) => entry.name);
}

/**
 * Determine the starting-funds multiplier granted by a Rich/Filthy Rich-type edge, matched
 * by name against the `richFundsMultipliers` setting (same name-matching pattern as
 * `calculateAncestryBonusEdgePoints`). Highest matching multiplier wins if more than one matches.
 *
 * @param {Object} character - Character object with edges
 * @param {Array<{name: string, multiplier: number}>} richFundsMultipliers - Parsed setting entries
 * @returns {number} Multiplier (1 if no matching edge selected)
 */
export function calculateRichFundsMultiplier(character, richFundsMultipliers = []) {
  if (!character.edges || typeof character.edges !== 'object' || !richFundsMultipliers.length) {
    return 1;
  }

  const edgeNames = Object.values(character.edges).map((e) => (e?.name || '').toLowerCase().trim());

  let multiplier = 1;
  for (const entry of richFundsMultipliers) {
    const normalized = entry.name.toLowerCase().trim();
    if (edgeNames.some((n) => n === normalized)) {
      multiplier = Math.max(multiplier, entry.multiplier);
    }
  }
  return multiplier;
}

/**
 * Calculate the Gear tab's starting-funds budget: `(pcStartingCurrency × richMultiplier) +
 * extraFundsBonus`, or the GM's manual override when set. There is no general "everyone gets
 * doubled starting funds" rule — the only multipliers are a matched Rich/Filthy Rich-type edge
 * and the Hindrances tab's Extra Funds perk allocation (each worth `pcStartingCurrency × 2`).
 *
 * @param {Object} character - Character object with edges, perkPointAllocations, gearFundsOverride
 * @param {Object} options
 * @param {number} options.pcStartingCurrency - SWADE's `pcStartingCurrency` world setting
 * @param {Array<{name: string, multiplier: number}>} [options.richFundsMultipliers] - Parsed setting entries
 * @returns {number} Starting funds budget
 */
export function calculateStartingFunds(character, { pcStartingCurrency = 0, richFundsMultipliers = [] } = {}) {
  const override = character.gearFundsOverride;
  if (override !== null && override !== undefined && override !== '') {
    const overrideValue = Number(override);
    if (!Number.isNaN(overrideValue)) return overrideValue;
  }

  const richMultiplier = calculateRichFundsMultiplier(character, richFundsMultipliers);
  const extraFundsBonus = calculateExtraFundsBonusCount(character) * (pcStartingCurrency * 2);
  return (pcStartingCurrency * richMultiplier) + extraFundsBonus;
}

/**
 * Convert a value to a die notation string.
 * Handles string format ("d6"), numeric absolute sides (4, 6, 8, etc.),
 * and numeric relative modifiers (+2 sides to add to base d4).
 *
 * @param {string|number} value - Value to convert
 * @returns {string|null} Die notation like "d4", "d6", etc., or null if invalid
 */
export function convertValueToDie(value) {
  const sidesToDie = { 4: 'd4', 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12' };

  if (typeof value === 'string' && value.match(/^d\d+$/)) {
    return value;
  }

  if (typeof value === 'number') {
    // Check if this looks like an absolute value (4, 6, 8, 10, 12)
    if ([4, 6, 8, 10, 12].includes(value)) {
      return sidesToDie[value];
    }
    // Relative modifier - add to base d4 (4 sides)
    if (value > 0 && value < 12) {
      const resultSides = 4 + value;
      return sidesToDie[resultSides] || null;
    }
  }

  return null;
}

/**
 * Extract attribute bonuses from an ancestry item and its child items.
 * Looks for bonuses in effects on both the ancestry and granted items.
 *
 * @param {Object} ancestryItem - Ancestry item object
 * @param {Array} [childItems] - Optional array of child items (ancestral abilities) with effects
 * @returns {Object} Map of attribute names to bonus information {vigor: {die: 'd6'}, etc.}
 */
export function getAncestryAttributeBonuses(ancestryItem, childItems = []) {
  const bonuses = {};

  if (!ancestryItem) {
    return bonuses;
  }

  try {
    // Check for bonuses in effects on the ancestry item itself
    if (ancestryItem.effects && Array.isArray(ancestryItem.effects)) {
      for (const effect of ancestryItem.effects) {
        if (effect.changes && Array.isArray(effect.changes)) {
          for (const change of effect.changes) {
            const match = change.key?.match(/system\.attributes\.(\w+)\.die(?:\.sides)?/);
            if (match) {
              const attrName = match[1].toLowerCase();
              const bonusDie = convertValueToDie(change.value);
              if (bonusDie) {
                bonuses[attrName] = { die: bonusDie, source: 'effect' };
              }
            }
          }
        }
      }
    }

    // Check for bonuses in child items (ancestral abilities, etc.)
    if (childItems && Array.isArray(childItems)) {
      for (const item of childItems) {
        // Handle both Array and EmbeddedCollection
        let effectsArray = [];
        if (item.effects) {
          if (Array.isArray(item.effects)) {
            effectsArray = item.effects;
          } else if (item.effects instanceof Map || item.effects[Symbol.iterator]) {
            try {
              effectsArray = Array.from(item.effects);
            } catch (e) {
              // Continue if conversion fails
            }
          }
        }

        for (const effect of effectsArray) {
          if (effect.changes && Array.isArray(effect.changes)) {
            for (const change of effect.changes) {
              const match = change.key?.match(/system\.attributes\.(\w+)\.die(?:\.sides)?/);
              if (match) {
                const attrName = match[1].toLowerCase();
                const bonusDie = convertValueToDie(change.value);

                // Only set bonus if not already set by ancestry effect
                if (bonusDie && !bonuses[attrName]) {
                  bonuses[attrName] = { die: bonusDie, source: 'child-item' };
                }
              }
            }
          }
        }
      }
    }

    // Check for bonuses in child items embedded on ancestry item
    if (ancestryItem.items && Array.isArray(ancestryItem.items)) {
      for (const item of ancestryItem.items) {
        if (item.type === 'modification' || item.system?.category === 'attribute-bonus') {
          const attrName = item.system?.linkedAttribute?.toLowerCase() || item.name?.toLowerCase();
          const dieBonusValue = item.system?.dieBonusValue;
          if (attrName && dieBonusValue && !bonuses[attrName]) {
            bonuses[attrName] = { die: dieBonusValue, source: 'embedded-item' };
          }
        }
      }
    }
  } catch (error) {
    console.warn('[Calculator] Failed to extract ancestry bonuses:', error);
  }

  return bonuses;
}

