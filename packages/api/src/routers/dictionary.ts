import type { DictionaryEntry } from "@dashvu/core";
import { dailyIndex, WORD_OF_THE_DAY } from "@dashvu/core";
import { dictionaryLookupInputSchema, dictionaryRelatedInputSchema } from "@dashvu/validators";

import { getConnector } from "../connectors/registry";
import type { Logger } from "../logger";
import { protectedProcedure, router } from "../trpc";

async function lookupWord(word: string, logger: Logger): Promise<DictionaryEntry | null> {
  try {
    const entry = await getConnector("dictionaryApi").invoke(null, { word });
    if (entry) return entry;
  } catch (error) {
    logger.warn("dictionaryApi lookup failed, falling back to wiktionary", {
      word,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return getConnector("wiktionary").invoke(null, { word });
}

export const dictionaryRouter = router({
  lookup: protectedProcedure.input(dictionaryLookupInputSchema).query(async ({ ctx, input }) => {
    return lookupWord(input.word, ctx.logger);
  }),
  related: protectedProcedure.input(dictionaryRelatedInputSchema).query(async ({ input }) => {
    return getConnector("datamuse").invoke(null, { word: input.word, relation: input.relation });
  }),
  wordOfTheDay: protectedProcedure.query(async ({ ctx }) => {
    const word = WORD_OF_THE_DAY[dailyIndex(WORD_OF_THE_DAY.length)];
    const entry = await lookupWord(word, ctx.logger);
    return { word, entry };
  }),
});
