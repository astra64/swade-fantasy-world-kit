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
    ancestry: null,
    
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
 * - Cost to increase a skill: 1pt per die step up to linked attribute, 2pts per step above
 * - Non-core skills cost 1pt to reach d4 (same as raising to d6 if attribute is d4)
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
  
  // Core skills free at d4 - only cost if raised above d4
  if (isFreeCoreSkill(skillName) && targetValue === 4) {
    return 0; // Free at d4
  }
  
  // If already at target value, no cost
  if (currentValue === targetValue) {
    return 0;
  }
  
  let totalCost = 0;
  
  // Sum cost for each step from current to target
  let stepValue = currentValue;
  while (stepValue < targetValue) {
    const nextValue = stepValue + 2; // Each step is +2 on die values (d4→d6→d8, etc.)
    
    // Cost per step: 1pt if next die ≤ attribute, 2pts if next die > attribute
    if (nextValue <= attributeValue) {
      totalCost += 1;
    } else {
      totalCost += 2;
    }
    
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
    // Each step above d4 costs 1 point
    if (attrValue > 4) {
      totalSpent += attrValue - 4;
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
