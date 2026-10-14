import { getConnector } from "../connectors/registry";
import { protectedProcedure, router } from "../trpc";

type PackResult<T> = { status: "ok"; data: T } | { status: "error" };

function toResult<T>(result: PromiseSettledResult<T>): PackResult<T> {
  return result.status === "fulfilled" ? { status: "ok", data: result.value } : { status: "error" };
}

export const funPackRouter = router({
  getPack: protectedProcedure.query(async () => {
    const [quote, joke, fact, onThisDay] = await Promise.allSettled([
      getConnector("zenQuotes").invoke(null, undefined),
      getConnector("icanhazdadjoke").invoke(null, undefined),
      getConnector("uselessFacts").invoke(null, undefined),
      getConnector("wikimediaOnThisDay").invoke(null, undefined),
    ]);

    return {
      quote: toResult(quote),
      joke: toResult(joke),
      fact: toResult(fact),
      onThisDay: toResult(onThisDay),
    };
  }),
});
