import { z } from "zod";

export const newsSourceSchema = z.enum([
  "hackerNews",
  "spaceflightNews",
  "bbcNews",
  "alJazeera",
  "allsides",
]);

export type NewsSource = z.infer<typeof newsSourceSchema>;

export const newsBriefingInputSchema = z.object({
  source: newsSourceSchema.default("alJazeera"),
  limit: z.number().int().min(1).max(25).default(10),
});

export type NewsBriefingInput = z.infer<typeof newsBriefingInputSchema>;
