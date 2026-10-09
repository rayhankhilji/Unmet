import { z } from "zod";

/** Brands are always shown as "A skincare brand like <Name>" (F-06.AC3). */
export const brandDisplayName = (name: string) => `A skincare brand like ${name}`;

export const BrandSummary = z.object({
  id: z.uuid(),
  slug: z.string(),
  displayName: z.string(),
  productCount: z.number().int().min(0),
});
export type BrandSummary = z.infer<typeof BrandSummary>;
