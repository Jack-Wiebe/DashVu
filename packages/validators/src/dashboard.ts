import { z } from "zod";

export const dashboardNameSchema = z.string().trim().min(1).max(40);

export const dashboardIdSchema = z.object({
  id: z.string().min(1),
});

export const dashboardCreateSchema = z.object({
  name: dashboardNameSchema.optional(),
});

export const dashboardRenameSchema = z.object({
  id: z.string().min(1),
  name: dashboardNameSchema,
});

export const dashboardReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type DashboardIdInput = z.infer<typeof dashboardIdSchema>;
export type DashboardCreateInput = z.infer<typeof dashboardCreateSchema>;
export type DashboardRenameInput = z.infer<typeof dashboardRenameSchema>;
export type DashboardReorderInput = z.infer<typeof dashboardReorderSchema>;
