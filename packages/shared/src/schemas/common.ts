import { z } from "zod";

export const Iso = z.iso.datetime({ offset: true });

export const PageQuery = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PageQuery = z.infer<typeof PageQuery>;

export const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

export const HealthResponse = z.object({ ok: z.boolean(), db: z.boolean() });
export type HealthResponse = z.infer<typeof HealthResponse>;
