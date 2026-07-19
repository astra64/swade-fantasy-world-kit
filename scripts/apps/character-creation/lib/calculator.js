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
 * @param {string} skillName - Skill name (lowercase, with dashes)
 * @returns {boolean} True if skill is a free core skill
 */
export function isFreeCoreSkill(skillName) {
  return FREE_CORE_SKILLS.includes(skillName?.toLowerCase());
}

/**
 * Initialize a blank SWADE character sheet structure.
 * Used by character creation form to provide base data.
 * 
 * @returns {Object} Character object with default attributes, skills, edges, hindrances
 */
export function initializeCharacter() {
  return {
    name: "",
    description: "",
    archetype: "",
    concept: "",
    ancestry: null,
    expandedAncestry: false,
    expandedChildItems: {},

    // Attributes: Each is {die: "d6", advances: 0}
    attributes: {
      agility: { die: "d4", advances: 0 },
      smarts: { die: "d4", advances: 0 },
      spirit: { die: "d4", advances: 0 },
      strength: { die: "d4", advances: 0 },
      vigor: { die: "d4", advances: 0 },
    },

    // Skills: Each is {die: "d4", advances: 0, linkedAttribute: "agility"}
    skills: {},

    // Character options: Each is {name: "edge/hindrance name"}
    edges: {},
    hindrances: {},

    // Advancement tracking
    experience: 0,
    advances: 0,
  };
}

/**
 * Calculate derived stats from character attributes and skills.
 * Returns object with Parry and Toughness (SWADE current edition).
 * 
 * @param {Object} character - Character object with attributes and skills
 * @param {Object} [armor] - Optional armor object with toughness bonus
 * @returns {Object} Derived stats {parry, toughness}
 */
export function calculateDerivedStats(character, armor = null) {
  const stats = {};
  
  try {
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
    const armorBonus = armor?.toughness ?? 0;
    stats.toughness = 2 + vigorBonus + armorBonus;
    
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
 * Apply an advancement (XP spend, skill increase, etc.).
 * Updates character object in-place and returns updated version.
 * 
 * @param {Object} character - Character object to update
 * @param {Object} advancement - Advancement action {type, target, value}
 * @returns {Object} Updated character object
 */
export function applyAdvancement(character, advancement) {
  if (!advancement || !advancement.type) {
    console.warn("[Character Creation] Invalid advancement:", advancement);
    return character;
  }
  
  const updated = foundry.utils.deepClone(character);
  
  try {
    switch (advancement.type) {
      case "skill-increase": {
        // Increase skill die or add rank
        const skillKey = advancement.target; // e.g., "fighting"
        if (updated.skills?.[skillKey]) {
          updated.skills[skillKey].advances = (updated.skills[skillKey].advances ?? 0) + 1;
        }
        break;
      }
      
      case "attribute-increase": {
        // Increase attribute die
        const attrKey = advancement.target; // e.g., "strength"
        if (updated.attributes?.[attrKey]) {
          updated.attributes[attrKey].advances = (updated.attributes[attrKey].advances ?? 0) + 1;
        }
        break;
      }
      
      case "add-edge": {
        // Add edge to character
        if (!updated.edges) updated.edges = [];
        updated.edges.push(advancement.target);
        break;
      }
      
      case "add-hindrance": {
        // Add hindrance to character
        if (!updated.hindrances) updated.hindrances = [];
        updated.hindrances.push(advancement.target);
        break;
      }
      
      case "spend-xp": {
        // Spend experience points
        const amount = advancement.value ?? 0;
        updated.experience = Math.max(0, (updated.experience ?? 0) - amount);
        break;
      }
      
      case "gain-xp": {
        // Gain experience points
        const amount = advancement.value ?? 0;
        updated.experience = (updated.experience ?? 0) + amount;
        break;
      }
      
      default:
        console.warn("[Character Creation] Unknown advancement type:", advancement.type);
    }
  } catch (error) {
    console.warn("[Character Creation] Failed to apply advancement:", error);
  }
  
  return updated;
}

/**
 * Calculate point cost for attribute/skill advancement.
 * Used to validate character creation budget and advancement costs.
 * 
 * @param {string} type - "attribute" or "skill"
 * @param {number} currentAdvances - Current number of advances
 * @returns {number} Cost in creation points
 */
export function calculateAdvancementCost(type, currentAdvances = 0) {
  // Placeholder cost structure (can be refined with actual SWADE rules)
  // In actual SWADE, costs scale based on current die and type
  if (type === "attribute") {
    return 5 * (currentAdvances + 1); // Attributes cost 5pts, 10pts, 15pts, etc.
  } else if (type === "skill") {
    return 1 * (currentAdvances + 1); // Skills cost 1pt, 2pts, 3pts, etc.
  }
  return 0;
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
 * Calculate total skill points spent in character creation.
 *
 * @param {Object} character - Character object with skills
 * @param {Object} skillCompendiumData - Compendium data with skill metadata (for linked attributes)
 * @returns {number} Total points spent on skills
 */
export function calculateTotalSkillPoints(character, skillCompendiumData = {}) {
  let totalSpent = 0;

  if (!character.skills || typeof character.skills !== 'object') {
    return 0;
  }

  // For each skill, calculate cost from d4 to selected die
  for (const [skillUuid, skillData] of Object.entries(character.skills)) {
    if (!skillData.die) continue;

    // Find skill metadata to get linked attribute
    const skillMeta = skillCompendiumData[skillUuid];
    const linkedAttrDie = skillMeta?.linkedAttribute
      ? character.attributes?.[skillMeta.linkedAttribute]?.die
      : "d4";

    // Get skill name for core skill check
    const skillName = skillData.name || "";

    // Calculate cost from d4 to current die
    const cost = calculateSkillCost(skillName, skillData.die, linkedAttrDie, "d4");
    totalSpent += cost;
  }

  return totalSpent;
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
 * Get available perk points from hindrances.
 * Maximum of 4 perk points, regardless of total hindrance points.
 *
 * @param {Object} character - Character object
 * @returns {number} Available perk points (0-4)
 */
export function getAvailablePerkPoints(character) {
  const hindrancePoints = calculateTotalHindrancePoints(character);
  return Math.min(hindrancePoints, 4);
}

/**
 * Generate perk point allocation slots based on total hindrance points.
 * Each slot can hold a 1-point or 2-point perk allocation.
 * Capped at 4 maximum slots regardless of total hindrance points.
 *
 * @param {Object} character - Character object with hindrances and perkPointAllocations
 * @returns {Array} Array of slot objects: { pointValue, selected }
 */
export function generatePerkSlots(character) {
  const hindrancePoints = calculateTotalHindrancePoints(character);
  const availablePerkPoints = Math.min(hindrancePoints, 4);  // Cap at 4
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

