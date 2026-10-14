import { z } from "zod";

export const discoverTabSchema = z.enum(["art", "space"]);

export type DiscoverTab = z.infer<typeof discoverTabSchema>;
