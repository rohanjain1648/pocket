import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Clean slate — this is demo/seed data only, dev.db is gitignored.
  await db.audioRender.deleteMany();
  await db.analysis.deleteMany();
  await db.beat.deleteMany();
  await db.episode.deleteMany();
  await db.relationship.deleteMany();
  await db.timelineEvent.deleteMany();
  await db.worldRule.deleteMany();
  await db.character.deleteMany();
  await db.series.deleteMany();

  const series = await db.series.create({
    data: {
      title: "The Ember Oracle",
      genre: "Mythic Fantasy",
      synopsis:
        "In the city of Kalpana, a mute oracle reads visions from dying embers while her brother hides a broken oath — and a stranger arrives carrying their dead mother's ring.",
      sourceType: "original",
    },
  });

  // --- Story Bible: seeded ahead of time so the Consistency Agent has
  // established facts to check episode 2 against. ---
  await db.character.create({
    data: {
      seriesId: series.id,
      name: "Meera",
      description:
        "A reluctant oracle who lost her voice as a child and speaks only through ember-scried visions.",
      traits: JSON.stringify(["mute", "clairvoyant", "guarded"]),
      firstAppearedEpisode: 1,
    },
  });

  await db.character.create({
    data: {
      seriesId: series.id,
      name: "Kabir",
      description:
        "Meera's older brother, a blacksmith who publicly renounced all magic after their mother's death.",
      traits: JSON.stringify(["skeptical", "protective", "forsworn against magic"]),
      firstAppearedEpisode: 1,
    },
  });

  await db.worldRule.create({
    data: {
      seriesId: series.id,
      rule: "Ember-scrying can only be performed at dusk, when embers glow but do not burn.",
      category: "magic-system",
    },
  });

  await db.worldRule.create({
    data: {
      seriesId: series.id,
      rule: "Anyone who breaks a forsworn oath against magic is marked by a burn scar that never heals.",
      category: "magic-system",
    },
  });

  await db.relationship.create({
    data: {
      seriesId: series.id,
      characterA: "Meera",
      characterB: "Kabir",
      type: "family",
      description: "Siblings bound by grief and a shared secret about their mother's death.",
    },
  });

  // --- Episode 1: establishes tone and ends on a strong cliffhanger ---
  await db.episode.create({
    data: {
      seriesId: series.id,
      number: 1,
      title: "The Dusk That Wouldn't Fall",
      rawScript: "(see beats)",
      beats: {
        create: [
          {
            order: 0,
            speaker: null,
            text: "Dusk settles over Kalpana like a held breath. In the blacksmith's yard, embers cool in their pit — waiting for the only person who can still read them.",
          },
          {
            order: 1,
            speaker: null,
            text: "Meera kneels before the embers, sleeves rolled, palms open. She has done this every dusk since her mother died, and every dusk Kabir pretends not to watch from the doorway.",
          },
          {
            order: 2,
            speaker: "Kabir",
            text: "You know I don't want you doing that. Not after everything it cost us.",
          },
          {
            order: 3,
            speaker: null,
            text: "Meera doesn't answer — she never does. Instead she lowers her hands into the ember pit, and the coals begin to glow brighter than any fire should.",
          },
          {
            order: 4,
            speaker: "The Embers",
            text: "A stranger rides through the eastern gate before the next dawn. He carries your mother's ring, and he does not come in peace.",
          },
          {
            order: 5,
            speaker: "Kabir",
            text: "A ring? That's — that's impossible. We buried that ring with her.",
          },
          {
            order: 6,
            speaker: null,
            text: "The embers dim to black all at once, as if something has clamped a hand over their glow. Somewhere beyond the yard wall, a horse screams.",
          },
        ],
      },
    },
  });

  // --- Episode 2: contains a deliberate continuity break (Kabir casts
  // magic with no burn scar, violating both an established world rule and
  // his own character trait) and one deliberately weak, saggy beat — both
  // are here to demonstrate the Consistency Agent and the Rewrite flow. ---
  await db.episode.create({
    data: {
      seriesId: series.id,
      number: 2,
      title: "A Debt Comes Due",
      rawScript: "(see beats)",
      beats: {
        create: [
          {
            order: 0,
            speaker: null,
            text: "The stranger arrives at midday, three hours ahead of the embers' warning — proof, if any were needed, that visions bend time as much as they bend truth.",
          },
          {
            order: 1,
            speaker: "Kabir",
            text: "Give me the ring. Now.",
          },
          {
            order: 2,
            speaker: null,
            text: "The market square was busy that day, full of merchants selling cloth and spices and small clay pots, and children running between the stalls while their mothers called after them, and somewhere a bell rang for the temple hour, and the sun was high and warm over the stone rooftops of Kalpana, casting long shadows that stretched toward the well at the center of the square where people gathered to draw water and gossip about the harvest and the price of grain this season.",
          },
          {
            order: 3,
            speaker: "Stranger",
            text: "Your sister's visions are not gifts, blacksmith. They are debts. And debts come due.",
          },
          {
            order: 4,
            speaker: null,
            text: "Kabir's hand closes around a fire-iron from his forge — and without thinking, without a single word of the old binding-chant, he hurls a bolt of raw ember-light across the square. The stranger goes down. The crowd screams.",
          },
          {
            order: 5,
            speaker: null,
            text: "Kabir stares at his own palm, breathing hard. Nothing. No scar. No mark. Whatever oath he broke, it broke silently.",
          },
          {
            order: 6,
            speaker: null,
            text: "Meera watches from the well, and for the first time since their mother died, she wishes she still had a voice — because what she just saw should not have been possible.",
          },
        ],
      },
    },
  });

  console.log(`Seeded series "${series.title}" (${series.id}) with 2 episodes.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
