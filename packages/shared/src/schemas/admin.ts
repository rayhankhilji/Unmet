import { z } from "zod";

export const AdminSessionInput = z.object({ token: z.string().min(1).max(512) });
export type AdminSessionInput = z.infer<typeof AdminSessionInput>;
