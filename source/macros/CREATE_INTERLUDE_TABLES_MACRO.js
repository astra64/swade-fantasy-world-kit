/**
 * DEVELOPMENT TOOL (Foundry Macro - not part of module runtime)
 *
 * Create Expanded Interludes Tables
 *
 * What it does:
 *   Creates four RollTable documents in the current world, one per suit of
 *   the Action Deck, for the Expanded Interludes prompt table:
 *     - Interlude - Hearts (Relationships)
 *     - Interlude - Clubs (Trials)
 *     - Interlude - Diamonds (Downtime)
 *     - Interlude - Spades (Backstory)
 *
 *   Each table has 13 results (2-10, J, Q, K, A) with formula "1d13 + 1",
 *   so rolling the table maps 1d13+1 -> 2..14 in the same order as a drawn
 *   card's rank. This is for automation/reference only -- the intended play
 *   procedure is still to draw an actual Action Card and consult the
 *   matching suit table for the prompt at that rank.
 *
 *   Joker rule (draw two, pick or combine) is a manual table-lookup step
 *   and is not automated here.
 *
 * Usage:
 *   1. Create a new macro in Foundry (type: script)
 *   2. Paste this entire file as macro content
 *   3. Run as GM
 *   4. Check notifications for a summary. Re-running will create duplicate
 *      tables -- delete the previous set first if you want a clean redo.
 */

const RANKS = [
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10" },
  { value: 11, label: "J" },
  { value: 12, label: "Q" },
  { value: 13, label: "K" },
  { value: 14, label: "A" }
];

const SUITS = [
  {
    name: "Interlude - Hearts (Relationships)",
    prompts: {
      14: "You share a quiet drink or meal with an extra. Who was it?",
      13: "An extra teaches you something new or you teach them. What was learned?",
      12: "You and an extra open up to each other. Who started the conversation?",
      11: "An extra comes to you for help, or you go to them.",
      10: "You and an extra get into an argument. What was it about? Did you make up?",
      9: "You learned something about an extras past or a secret they've been keeping. Who was it?",
      8: "You and an extra discover something you have in common, perhaps a shared history. What is it?",
      7: "An extra was behaving oddly or out of character. What were they doing? What did you do about it?",
      6: "You get into a contest with an extra. What was the contest? Who won? Did you win anything?",
      5: "You share a bonding moment with one of the animal extras. Describe it.",
      4: "An extra repays a debt they owe you, or vice versa. What was it?",
      3: "You and an extra become closer. What happened?",
      2: "You and an extra drift apart. What happened?"
    }
  },
  {
    name: "Interlude - Clubs (Trials)",
    prompts: {
      14: "You are confronted by your greatest fear. How did you handle it?",
      13: "Your character becomes angry about something. What happened?",
      12: "Your character was overcome with grief or sadness. What brought it on?",
      11: "You or your party lost or ran out of something important. What was it?",
      10: "The group encountered an obstacle on the road. How did you help to overcome it?",
      9: "You or the party have had the worst luck imaginable. What's been going on? How have you been coping?",
      8: "Your character had an accident. What happened? How bad was it?",
      7: "The party has caused offence to some outside Faction. Who's at fault?",
      6: "Your character was caught alone in a dangerous situation. How did you handle it?",
      5: "The weather has turned on you. How bad was it?",
      4: "Your character has been having trouble sleeping lately. What's causing it?",
      3: "Your character has experienced some type of ill omen. What was it? Make a prediction about what it means.",
      2: "One of the extras died or left the group. What happened to them?"
    }
  },
  {
    name: "Interlude - Diamonds (Downtime)",
    prompts: {
      14: "Your character spends time alone in quiet contemplation. What do they do?",
      13: "Your character studies something new. What is it?",
      12: "Your character spends time making or repairing something. What is it?",
      11: "You spend the time doing chores. What were they?",
      10: "Your character practises a skill. What is it?",
      9: "Your character searches for something to help the group. What were they looking for?",
      8: "Your character has spent some time thinking about the future. What's troubled them? What makes them hopeful?",
      7: "Your character has worked to address one of their hinderances.",
      6: "Your character has gone exploring by themselves for a while. Where have they been?",
      5: "Your character indulges in one of his hobbies, or picks up a new one. What is it?",
      4: "Your character has spent time making plans to deal with an upcoming situation. What is he preparing for? How does he intend to deal with it?",
      3: "The character is left to his own devices in a place he usually spends time with the rest of the party. How does he occupy his time?",
      2: "Your character has made a conscious effort to relax. What does that look like for them? Did it work?"
    }
  },
  {
    name: "Interlude - Spades (Backstory)",
    prompts: {
      14: "A great victory or personal triumph.",
      13: "What does your character want or currently have?",
      12: "What tragedy did your character encounter in the past?",
      11: "What was your characters closest brush with death before this all started?",
      10: "How did your character gain their particular set of skills?",
      9: "Where does your greatest fear comes from?",
      8: "What's the strangest thing your character has ever seen or done?",
      7: "Who or what does your character miss the most?",
      6: "What is your characters great regret?",
      5: "What happened in your past that motivates you to continue?",
      4: "When you were younger you were in a situation that reminds you of recent events. What happened?",
      3: "What doesn't your character do anymore?",
      2: "What part of your history could come back to haunt you?"
    }
  }
];

async function createInterludeTables() {
  let created = 0;

  for (const suit of SUITS) {
    const results = RANKS.map((rank) => ({
      type: "text",
      name: rank.label,
      description: suit.prompts[rank.value],
      range: [rank.value, rank.value],
      weight: 1,
      drawn: false
    }));

    await RollTable.create({
      name: suit.name,
      description: "Draw an Action Card and consult the row for its rank. On a Joker, draw two cards and either pick the one you prefer or combine them.",
      formula: "1d13 + 1",
      replacement: true,
      displayRoll: true,
      results
    });

    created++;
    console.log(`Created table: ${suit.name}`);
  }

  ui.notifications.success(`Expanded Interludes: created ${created} tables.`);
}

await createInterludeTables();
