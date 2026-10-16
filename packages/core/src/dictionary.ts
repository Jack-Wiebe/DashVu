/**
 * Shared dictionary/thesaurus types and the bundled Word of the Day list.
 * No runtime dependencies so it can live in `@dashvu/core`.
 */

export interface DictionaryDefinition {
  definition: string;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  phonetic: string | null;
  audio: string | null;
  meanings: DictionaryMeaning[];
}

export interface RelatedWord {
  word: string;
  score: number | null;
}

export type RelatedRelation = "syn" | "ant" | "ml";

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Convert a fragment of (mostly wiki-link) HTML into plain text. Used by the
 * Wiktionary connector, whose definitions arrive as HTML.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Curated list of interesting words used for the deterministic Word of the Day.
 * Kept in core so the API (selection) and the client (labels) agree without a
 * network round-trip just to pick the word.
 */
export const WORD_OF_THE_DAY: string[] = [
  "serendipity",
  "ephemeral",
  "eloquent",
  "resilience",
  "wanderlust",
  "petrichor",
  "halcyon",
  "myriad",
  "luminous",
  "solitude",
  "quixotic",
  "reverie",
  "liminal",
  "sonder",
  "epiphany",
  "nebulous",
  "ubiquitous",
  "audacious",
  "benevolent",
  "cacophony",
  "deference",
  "ebullient",
  "fastidious",
  "gregarious",
  "harbinger",
  "idiosyncratic",
  "juxtapose",
  "kindle",
  "labyrinth",
  "mellifluous",
  "nonchalant",
  "obfuscate",
  "panacea",
  "quaint",
  "ruminate",
  "sycophant",
  "tangential",
  "unravel",
  "vicarious",
  "whimsical",
  "zenith",
  "aplomb",
  "brevity",
  "candid",
  "dulcet",
  "effervescent",
  "fortuitous",
  "gossamer",
  "hedonism",
  "ineffable",
  "jubilant",
  "kismet",
  "lucid",
  "meticulous",
  "nuance",
  "opulent",
  "pragmatic",
  "quell",
  "reprieve",
  "sagacious",
  "tranquil",
  "unfathomable",
  "veracity",
  "wistful",
  "zealous",
  "ardent",
  "buoyant",
  "clandestine",
  "diaphanous",
  "esoteric",
  "fluctuate",
  "garrulous",
  "hackneyed",
  "inexorable",
  "juxtaposition",
  "kinetic",
  "lament",
  "mercurial",
  "nascent",
  "obsolete",
  "perennial",
  "quandary",
  "resplendent",
  "scintillating",
  "tenacious",
  "unwitting",
  "venerable",
  "wander",
  "yearning",
  "zen",
];
