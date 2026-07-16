# Character Creation v0.6.2 - Testing Checklist

## Pre-Testing Setup
- [ ] Reload Foundry (F5 or hard refresh)
- [ ] Open browser console (F12 → Console tab)
- [ ] Watch for any red errors during init/ready hooks
- [ ] Create a test actor if you don't have one

---

## Module Load Validation

### ✅ Verify Module Initializes
1. Open Foundry world
2. Check console for red errors (should be none)
3. In console, run: `console.log(window.CharacterManager);`
   - Should show: `class CharacterManager extends FormApplication`
4. In console, run: `console.log(window.AdvancementManager);`
   - Should show: `class AdvancementManager extends FormApplication`

**Pass Criteria:** Classes are available, no errors in console

---

## Character Creator Testing

### ✅ Test 1: Open from Settings Menu
1. Click **Game Settings** (gear icon, bottom-left)
2. Look for **SWADE Fantasy World Kit** section
3. Find **"Create Character"** button
4. Click **"Open Creator"**
   - ✅ Character Creator form opens in new window
   - ✅ Form shows tabs: Basics, Traits, Edges, Hindrances, Summary

### ✅ Test 2: Tab Navigation
1. Character Creator window is open
2. Click each tab in order:
   - **Basics** — Shows character name input + ancestry selector
   - **Traits** — Shows 5 attributes with die buttons + skills grouped by attribute
   - **Edges** — Shows multi-select dropdown with edges
   - **Hindrances** — Shows multi-select dropdown with hindrances
   - **Summary** — Shows character summary + derived stats

**Pass Criteria:** All tabs load without errors, no broken layouts

### ✅ Test 3: Enter Character Name
1. Go to **Basics** tab
2. Type a character name in the "Character Name" field (e.g., "Thorgrim Ironforge")
3. Move to another tab
4. Come back to **Basics** tab
   - ✅ Name is preserved

**Pass Criteria:** Name input accepts text and persists

### ✅ Test 4: Ancestry Selection
1. Go to **Basics** tab
2. Click "Ancestry" dropdown
   - ✅ Dropdown opens and shows ancestry options (e.g., "Dwarf", "Elf", "Human", etc.)
   - ✅ Options come from Fantasy compendium (alphabetical order)
3. Select an ancestry
   - ✅ Selection is saved (visible in dropdown)

**Pass Criteria:** Ancestry selector populates from compendium and selection persists

### ✅ Test 5: Traits Tab - Attributes
1. Go to **Traits** tab
2. Look at attribute sections (5 total: Agility, Smarts, Spirit, Strength, Vigor)
   - ✅ Each shows die value buttons: [d4] [d6] [d8] [d10] [d12]
   - ✅ All start at d4 (d4 button disabled/grayed out)
3. Click [d6] for Strength
   - ✅ Button shows as active (blue/highlighted)
   - ✅ Attribute die changes to d6
4. Point counter at bottom shows: Attributes 1/5 (after clicking d6)
   - ✅ Point counter updates in real-time
5. Continue clicking to raise Strength to d10
   - ✅ Uses 3 points total (d4→d6→d8→d10)
   - ✅ Counter shows Attributes 3/5

**Pass Criteria:** Attribute die selection works, point counter accurate, cannot lower below d4

### ✅ Test 6: Traits Tab - Skills Grouped by Attribute
1. Still in **Traits** tab, look at Strength section (where you set Strength die)
   - ✅ Below attribute buttons, see list of skills linked to Strength
   - ✅ Should see: Athletics, Swimming, Throwing, etc.
2. Look for the [FREE] badge next to Athletics
   - ✅ Athletics has [FREE] badge (core skill)
   - ✅ Other skills don't have badge
3. Scroll to Agility section
   - ✅ See different skills: Fighting, Shooting, Riding, Stealth (Stealth has [FREE])
4. Scroll to Smarts section
   - ✅ See skills: Common Knowledge (FREE), Notice (FREE), Academics, etc.

**Pass Criteria:** Skills grouped correctly, core skills marked with FREE badge

### ✅ Test 7: Traits Tab - Skill Selection
1. In **Traits** tab, under Agility section, find Fighting skill
2. Fighting shows: [d4] [d6] [d8] [d10] [d12] buttons
3. Click [d6] for Fighting
   - ✅ Button highlights (active state)
   - ✅ Skills point counter updates: Skills X/12
4. Click [d8] for Shooting (also under Agility)
   - ✅ Fighting stays at d6
   - ✅ Shooting now at d8
   - ✅ Point counter updates correctly
5. Go to Smarts, click [d6] for Common Knowledge
   - ✅ Common Knowledge is FREE core skill, no cost increase
   - ✅ Point counter unchanged (stays same)
6. Click [d8] for Common Knowledge
   - ✅ Cost increases (1 point: d6→d8 above d4)
   - ✅ Counter updates: Skills X/12

**Pass Criteria:** Skills select independently, point counter tracks costs correctly, core skills don't cost at d4

### ✅ Test 8: Traits Tab - Point Budget Limits
1. In **Traits** tab, raise attributes to use 5/5 points
   - Example: d4→d6 (each attribute = 1pt, so 5 attributes × 1pt = 5pts)
2. Point counter shows: Attributes 5/5
3. Try to click d8 on an attribute
   - ✅ Can still click (not disabled)
   - ✅ Counter goes RED: Attributes 6/5 (over budget)
4. Click skills to use 12+ points
   - ✅ Skills counter goes RED: Skills 13/12
   - ✅ UI warns but doesn't prevent selection

**Pass Criteria:** Over-limit warnings work, counter goes red, selection not blocked

### ✅ Test 9: Traits Tab - Derived Stats Pinned
1. In **Traits** tab, look at bottom of screen
   - ✅ See pinned footer (dark gray/blue background)
   - ✅ Shows: Parry: X | Toughness: Y
2. Click [d6] for Strength attribute
   - ✅ Toughness value updates in footer
3. Switch to **Basics** tab
   - ✅ Footer still visible at bottom with Parry & Toughness
4. Switch to **Summary** tab
   - ✅ Footer still pinned with same values
5. Go back to **Traits**, select Fighting at d8
   - ✅ Parry value updates in pinned footer

**Pass Criteria:** Derived stats pinned to bottom, visible on all tabs, update in real-time

### ✅ Test 10: Edges & Hindrances (unchanged from old tests)
1. Go to **Edges** tab
2. Select 2-3 edges
   - ✅ Selected edges list appears below
3. Go to **Hindrances** tab
4. Select 1-2 hindrances
   - ✅ Selected hindrances list appears below

**Pass Criteria:** Both multi-selects work independently

### ✅ Test 10a: Hindrance Dropdown Filtering
1. Go to **Hindrances** tab
2. Click the search/dropdown to see all available hindrances
   - ✅ Dropdown shows all hindrances from compendium
3. Select a hindrance (e.g., "Curious")
   - ✅ Hindrance is added and appears in selected list
4. Click the search/dropdown again
   - ✅ "Curious" is NO LONGER in the dropdown options
   - ✅ Only unselected hindrances appear
5. Add another hindrance, verify it also disappears from dropdown
   - ✅ Each added hindrance filters out of the available options

### ✅ Test 10b: Major/Minor Radio Button Persistence
1. Go to **Hindrances** tab
2. Add a hindrance (e.g., "Curious")
   - ✅ Shows in selected hindrances list
   - ✅ Radio buttons appear: [Major] [Minor]
3. Select "Major" radio button
   - ✅ Major radio is checked
   - ✅ Points show as 2 (major hindrance)
4. Click "Minor" radio button
   - ✅ Minor radio is now checked
   - ✅ Points update to 1 (minor hindrance)
5. Fill in character with all required info (name, ancestry, attributes, skills, hindrance set to Minor)
6. Go to **Summary** tab and click **"Create Character"** button
   - ✅ Character is created as actor
7. Close the Character Creator and reopen it for the same actor (via macro or settings)
   - ✅ Hindrance shows with Major: false and points: 1 (or verify in actor sheet)

**Pass Criteria:** Major/minor flag saves correctly to actor when form is submitted

### ✅ Test 11: Summary Tab & Derived Stats
1. Go to **Summary** tab
2. Check the derived statistics:
   - ✅ **Parry:** Shows calculated value (e.g., "2" if no Fighting skill, increases with Fighting die)
   - ✅ **Toughness:** Shows calculated value (e.g., "2" base, increases with Vigor die)
3. Also check at bottom of screen:
   - ✅ Pinned footer shows same Parry & Toughness values

**Pass Criteria:** Summary tab shows correct calculated stats

### ✅ Test 12: Export as JSON
1. Fill in basic character:
   - Character name (e.g., "Test Character")
   - Ancestry selection
   - Traits: Set Agility to d6, select Fighting at d8
   - Select 1-2 edges
2. Go to **Summary** tab
3. Click **"Export JSON"** button
   - ✅ Browser download dialog appears
   - ✅ File named `Test Character.json` downloads
4. Open downloaded file in text editor
   - ✅ File contains valid JSON with character data
   - ✅ Shows attributes (agility: d6, etc.)
   - ✅ Shows skills (fighting: d8)
   - ✅ Shows edges

**Pass Criteria:** JSON export downloads valid file with new data structure

### ✅ Test 13: Create Character as Actor
1. Fill in character with:
   - Character name
   - Ancestry
   - At least 1 attribute raised (e.g., Strength d6)
   - At least 2 skills (e.g., Fighting d6, Shooting d8)
   - 1 edge
2. Go to **Summary** tab
3. Click **"Create Character"** button
   - ✅ Notification appears: "[Character Creation] Created actor: [CharacterName]"
   - ✅ New actor appears in **Actors** tab in sidebar
4. Click the new actor in sidebar
   - ✅ Actor sheet opens
   - ✅ Actor has your character's attributes, skills, edges

**Pass Criteria:** New actor created with new Traits data structure

---

## Advancement Manager Testing

### ✅ Test 14: Open Advancement Manager
1. Have an actor in the world (created from Test 13, or any existing actor)
2. Select the actor's token on the map (or open Actor sheet)
3. In console, run: `new window.AdvancementManager(game.actors.contents[0]).render(true);`
   - ✅ Advancement Manager window opens
   - ✅ Title shows actor name: "Advance SWADE Character - [ActorName]"
   - ✅ Shows tabs: XP & Summary, Skill Advancement, Attribute Advancement, Edge Selection

### ✅ Test 15: XP Tracking
1. Advancement Manager is open
2. Look at **XP & Summary** tab
   - ✅ Shows "Current Experience Points" field (should be 0 or actor's XP)
   - ✅ Shows "Advances Used" field (should be 0)
3. Edit the XP value (e.g., change to 10)
   - ✅ Value updates in the input
4. Click outside the input to save
   - ✅ Actor's XP updates in the world

**Pass Criteria:** XP input works and saves to actor

### ✅ Test 16: Skill Advancement
1. Set actor XP to at least 5 in Advancement Manager
2. Go to **Skill Advancement** tab
   - ✅ Shows list of available skills from compendium
   - ✅ Each skill has an "Add (+1 XP)" button (or correct cost)
3. Click "Add" for a skill (e.g., Fighting)
   - ✅ Skill appears in "Selected Advancements" list with cost
   - ✅ "Total Cost" at top updates (e.g., "Total Cost: 1 XP")
4. Add another skill
   - ✅ "Total Cost" updates (e.g., "Total Cost: 2 XP")

**Pass Criteria:** Skills can be added and costs calculate correctly

### ✅ Test 17: Attribute Advancement
1. XP is still 5+ in Advancement Manager
2. Go to **Attribute Advancement** tab
   - ✅ Shows 5 attribute buttons: Agility, Smarts, Spirit, Strength, Vigor
   - ✅ Each button shows "Increase (+5 XP)" (or correct cost)
3. Click "Increase" for Strength
   - ✅ "Strength" appears in "Selected Advancements" list
   - ✅ "Total Cost" updates (e.g., "Total Cost: 5 XP")

**Pass Criteria:** Attributes can be added and costs calculate

### ✅ Test 18: Remove Advancement
1. You have 2+ advancements selected (from Tests 16-17)
2. In **XP & Summary** tab, look at "Selected Advancements"
3. Click "Remove" button on one advancement
   - ✅ Advancement is removed from list
   - ✅ "Total Cost" recalculates

**Pass Criteria:** Advancements can be removed

### ✅ Test 19: Apply Advancements
1. Have advancements selected with total cost ≤ current XP
2. Click **"Apply Advancements"** button (checkmark icon)
   - ✅ Notification appears: "[Advancement Manager] Advancements applied successfully"
   - ✅ Form refreshes
   - ✅ Selected advancements list clears
3. Check actor in sidebar
   - ✅ Actor's XP decreased by advancement cost
   - ✅ Actor's Advances counter increased

**Pass Criteria:** Advancements apply, XP deducted, advances incremented

### ✅ Test 20: Insufficient XP Warning
1. Clear all advancements
2. Set actor XP to 2
3. Go to **Skill Advancement** tab
   - ✅ Shows "Insufficient XP for skill advancements. Required: 1 XP" (or similar message)
   - ✅ No skill buttons shown (or disabled)

**Pass Criteria:** UI shows when XP is insufficient

---

## Macro Testing

### ✅ Test 21: Character Creator Macro
1. Create a new **Script** macro:
   - Name: "Create Character"
   - Type: Script
2. Paste code from `source/macros/CHARACTER_CREATOR_MACRO.js`
3. Click "Save Macro"
4. Click the macro (or drag to hotbar and click)
   - ✅ Character Creator window opens

**Pass Criteria:** Macro opens Character Creator

### ✅ Test 22: Advancement Manager Macro
1. Create a new **Script** macro:
   - Name: "Advance Character"
   - Type: Script
2. Paste code from `source/macros/ADVANCEMENT_MANAGER_MACRO.js`
3. Click "Save Macro"
4. Select an actor token on the map
5. Click the macro
   - ✅ Advancement Manager opens for that actor
6. Try macro with **no actor selected**
   - ✅ Shows warning: "No actor selected..."

**Pass Criteria:** Macro works with selected actor, warns if none selected

---

## Optional: Curated Visibility Testing

### ✅ Test 23: Curated Mode Filtering (Optional)
1. Open **Game Settings** → World Settings tab
2. Find **"Curated Mode"** setting
3. Verify it's enabled (checkbox checked)
4. Open Character Creator
5. Go to **Basics** tab
6. Click Ancestry selector
   - ✅ Only shows ancestries from Fantasy compendium (not other packs)
7. Disable Curated Mode (uncheck)
8. Reopen Character Creator
   - ✅ Ancestry selector may show more packs (if available)

**Pass Criteria:** Filtering respects Curated Mode setting

### ✅ Test 24: GM Sees All Packs (Optional)
1. Ensure you're logged in as **GM**
2. Curated Mode is enabled
3. "GM Sees All Packs" is enabled
4. Open Character Creator
5. Ancestry selector shows curated packs
   - ✅ If you're GM: All Fantasy packs visible
6. Have a **player** log in and open Character Creator
7. They should see only curated/filtered packs
   - ✅ Filtering works for non-GMs

**Pass Criteria:** GM override works (if multi-user test available)

---

## Console Debugging (If Issues Occur)

### Common Issues & Fixes

**Issue: "CharacterManager is not a constructor"**
- Check console for red errors during init
- Reload page (F5)
- Verify: `console.log(window.CharacterManager)` shows the class

**Issue: "Compendiums not loading"**
- Check: Do you have Fantasy compendiums installed?
- Check console: `game.packs.get('swade-fantasy-world-kit.ancestries-fantasy')`
- Should return the pack object, not null

**Issue: "Form won't save/create actor"**
- Check console for errors when clicking buttons
- Verify actor type is correct (should be 'character')
- Check that world has permission to create actors (usually yes for GM)

**Issue: "Advancement Manager crashes"**
- Check: Is actor valid? Run `game.actors.contents[0]` in console
- Should show an actor object, not undefined
- If null, create an actor first

---

## Sign-Off

After completing all tests (1-24), summarize:
- ✅ Module loads without errors
- ✅ Character Creator: Basics tab, Traits tab (attributes + skills), Edges, Hindrances, Summary all work
- ✅ Traits tab: Attribute selection, skill selection, point budgets, derived stats pinning all functional
- ✅ Advancement Manager: XP, skill/attribute advancement, apply works
- ✅ Macros: Both open correctly
- ✅ (Optional) Curated visibility filtering works

## Notes on v0.6.2 Redesign

**Key Changes from Original Testing Checklist:**
- Removed old "Attributes" tab (static view)
- Removed old "Skills" tab (multi-select dropdown)
- Added new "Traits" tab combining attributes and skills on single page
- Attributes now have die value buttons (d4-d12) for selection
- Skills grouped under their linked attributes
- Point budgets tracked in real-time (Attributes 0/5, Skills 0/12)
- Derived stats (Parry, Toughness) pinned to bottom of screen, visible on all tabs
- Point counter goes RED when over budget (warns user, doesn't prevent)
- Free core skills marked with [FREE] badge

**Status:** Ready for v0.6.2 release / Ready for next phase
