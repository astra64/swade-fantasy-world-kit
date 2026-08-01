/**
 * DEVELOPMENT TOOL (Foundry Macro - not part of module runtime)
 *
 * Draw Expanded Interludes
 *
 * What it does:
 *   Draws one result from each of the four Interlude tables created by
 *   CREATE_INTERLUDE_TABLES_MACRO.js (Hearts, Clubs, Diamonds, Spades) and
 *   posts a single combined chat message with all four prompts.
 *
 *   Each table roll is independent (1d13 + 1 per suit), matching drawing
 *   one card per category rather than a single card's suit+rank. Useful
 *   for a full end-of-session interlude covering all four prompt types
 *   for one character, or as a quick preview of the tables' range.
 *
 * Usage:
 *   1. Create a new macro in Foundry (type: script)
 *   2. Paste this entire file as macro content
 *   3. Run it. A chat message with all four results is posted.
 *   4. Requires the four "Interlude - <Suit> (...)" tables to already exist
 *      in the world (RollTable directory).
 */

const CATEGORIES = [
  {
    table: "Interlude - Hearts (Relationships)",
    label: "Relationships (Hearts)",
    blurb: "A meaningful moment that progresses a relationship (for better or worse)."
  },
  {
    table: "Interlude - Clubs (Trials)",
    label: "Trials (Clubs)",
    blurb: "The story of an obstacle or challenge the party encountered on their trip."
  },
  {
    table: "Interlude - Diamonds (Downtime)",
    label: "Downtime (Diamonds)",
    blurb: "What the hero does when left alone."
  },
  {
    table: "Interlude - Spades (Backstory)",
    label: "Backstory (Spades)",
    blurb: "A tale of the character's past, told through her voice and narration."
  }
];

async function drawInterludes() {
  const missing = [];
  const draws = [];

  for (const category of CATEGORIES) {
    const table = game.tables.getName(category.table);
    if (!table) {
      missing.push(category.table);
      continue;
    }

    const draw = await table.draw({ displayChat: false });
    const result = draw.results[0];
    draws.push({
      label: category.label,
      blurb: category.blurb,
      rank: result?.name ?? "?",
      prompt: result?.description ?? "(no result)"
    });
  }

  if (missing.length) {
    ui.notifications.error(`Missing tables: ${missing.join(", ")}`);
  }

  if (!draws.length) return;

  for (let i = draws.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [draws[i], draws[j]] = [draws[j], draws[i]];
  }

  const sections = draws
    .map(
      (d) => `
      <div style="margin-bottom: 0.75em;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong>${d.label}</strong>
          <span style="opacity: 0.6; font-size: 0.9em;">${d.rank}</span>
        </div>
        <div style="font-style: italic; opacity: 0.75; font-size: 0.9em; margin-bottom: 0.15em;">${d.blurb}</div>
        <div>${d.prompt}</div>
      </div>`
    )
    .join('<hr style="margin: 0.5em 0; opacity: 0.3;">');

  const content = `
    <div>
      <h3 style="margin-bottom: 0.25em;">Expanded Interludes</h3>
      <p style="margin-top: 0;">Tell a story from your character's point of view. Any who participate in the Interlude receive a Benny. Choose from one of the following prompts.</p>
      <hr style="margin: 0.5em 0;">
      ${sections}
    </div>`;

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker()
  });
}

await drawInterludes();
