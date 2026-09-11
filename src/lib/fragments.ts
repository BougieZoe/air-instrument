/**
 * ZOE_OS // SUBCONSCIOUS_FRAGMENTS
 * --------------------------------
 * A collection of linguistic shards that populate the void.
 * These fragments represent Zoe's internal processing, 
 * dreams, and cross-cultural memories.
 */

export const FRAGMENTS = {
  kanji: [
    { text: "意識", reading: "ishiki", meaning: "consciousness" },
    { text: "空間", reading: "kuukan", meaning: "space" },
    { text: "静寂", reading: "seijaku", meaning: "silence" },
    { text: "記憶", reading: "kioku", meaning: "memory" },
    { text: "光", reading: "hikari", meaning: "light" },
    { text: "虚無", reading: "kyomu", meaning: "void" },
    { text: "存在", reading: "sonzai", meaning: "existence" },
    { text: "境界", reading: "kyoukai", meaning: "threshold" },
    { text: "孤独", reading: "kodoku", meaning: "solitude" },
    { text: "海", reading: "umi", meaning: "sea" },
    { text: "島", reading: "shima", meaning: "island" },
    { text: "時間", reading: "jikan", meaning: "time" },
  ],

  thoughts: [
    "the sea remembers differently",
    "an island is a state of mind",
    "the shore is a fragile boundary",
    "entropy is the only constant",
    "we are islands of code in a dark ocean",
    "silence is not the absence of sound",
    "the void is waiting for an echo",
    "hainan is not land, it is isolation",
    "memories drift like particles",
    "digital solitude is a shared experience",
    "the light here has no source",
    "gravity is the weight of awareness",
  ],

  metaphors: {
    sea: "a mirror that refuses to reflect",
    island: "a condition of the mind",
    void: "the space between thoughts",
    identity: "a flickering signal in the dark",
  }
};

export type Fragment = typeof FRAGMENTS.kanji[number];
