import { z } from "zod";

export const dictionaryTabSchema = z.enum(["dictionary", "thesaurus", "wotd"]);

export type DictionaryTab = z.infer<typeof dictionaryTabSchema>;

export const dictionaryWordSchema = z.string().trim().min(1).max(60);

export const relatedRelationSchema = z.enum(["syn", "ant", "ml"]);

export type RelatedRelationInput = z.infer<typeof relatedRelationSchema>;

export const dictionaryLookupInputSchema = z.object({
  word: dictionaryWordSchema,
});

export type DictionaryLookupInput = z.infer<typeof dictionaryLookupInputSchema>;

export const dictionaryRelatedInputSchema = z.object({
  word: dictionaryWordSchema,
  relation: relatedRelationSchema.default("syn"),
});

export type DictionaryRelatedInput = z.infer<typeof dictionaryRelatedInputSchema>;
