import { z } from "zod";

/**
 * Planner widget validation. A single widget kind holds three independent item
 * lists (notes, todos, countdowns), discriminated by `mode`.
 */

export const plannerModeSchema = z.enum(["notes", "todos", "countdown"]);

export type PlannerMode = z.infer<typeof plannerModeSchema>;

export const plannerItemTextSchema = z.string().trim().min(1).max(500);

export const plannerItemsInputSchema = z.object({
  widgetId: z.string().min(1),
  mode: plannerModeSchema,
});

export type PlannerItemsInput = z.infer<typeof plannerItemsInputSchema>;

export const plannerItemCreateSchema = z.object({
  widgetId: z.string().min(1),
  mode: plannerModeSchema,
  text: plannerItemTextSchema,
  date: z.string().datetime().nullish(),
});

export type PlannerItemCreateInput = z.infer<typeof plannerItemCreateSchema>;

export const plannerItemUpdateSchema = z.object({
  id: z.string().min(1),
  text: plannerItemTextSchema.optional(),
  checked: z.boolean().optional(),
  date: z.string().datetime().nullish(),
});

export type PlannerItemUpdateInput = z.infer<typeof plannerItemUpdateSchema>;

export const plannerItemRemoveSchema = z.object({
  id: z.string().min(1),
});

export type PlannerItemRemoveInput = z.infer<typeof plannerItemRemoveSchema>;

export const plannerItemsReorderSchema = z.object({
  widgetId: z.string().min(1),
  mode: plannerModeSchema,
  ids: z.array(z.string().min(1)),
});

export type PlannerItemsReorderInput = z.infer<typeof plannerItemsReorderSchema>;
