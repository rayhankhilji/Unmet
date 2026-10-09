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

export const CatalogProductInput = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  format: z.string().min(1),
  keyIngredients: z.array(z.string().min(1).toLowerCase()),
  claims: z.array(z.string().min(1)),
  skinTypes: z.array(z.string().min(1)).min(1),
  url: z.url(),
});
export type CatalogProductInput = z.infer<typeof CatalogProductInput>;

/** `data/brands/<slug>.json` (F-06). `pnpm brands:load` validates against this (P3.T1). */
export const BrandFile = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  positioning: z.string().min(40),
  catalogue: z.array(CatalogProductInput).min(15).max(40),
});
export type BrandFile = z.infer<typeof BrandFile>;
