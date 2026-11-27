import "server-only";

import { z } from "zod";
import { ANY_SECTOR, isSectorCode, isStageCode, toCode } from "@/shared/lib/sector-taxonomy";

const ThesisInput = z
  .object({
    sectors: z.array(z.string().min(1).max(60)).max(60),
    stages: z.array(z.string().min(1).max(60)).max(20),
    chequeMinCr: z.number().min(0).max(100000).nullable(),
    chequeMaxCr: z.number().min(0).max(100000).nullable(),
  })
  .refine((t) => t.chequeMinCr == null || t.chequeMaxCr == null || t.chequeMinCr <= t.chequeMaxCr, {
    message: "The minimum cheque can't be more than the maximum.",
  });

export type ThesisInputT = z.infer<typeof ThesisInput>;

/**
 * Validates a thesis edit (clause 2.6). Sectors and stages must be the agents'
 * codes (or ANY for any sector), so every choice means the same thing to the
 * portal's matching and to the agents.
 */
export function validateThesis(raw: unknown): { ok: true; value: ThesisInputT } | { ok: false; error: string } {
  const parsed = ThesisInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid thesis." };
  let sectors = [...new Set(parsed.data.sectors.map(toCode))];
  const stages = [...new Set(parsed.data.stages.map(toCode))];
  if (sectors.some((s) => s !== ANY_SECTOR && !isSectorCode(s)) || stages.some((s) => !isStageCode(s))) {
    return { ok: false, error: "Pick sectors and stages from the list." };
  }
  // "Any sector" stands alone.
  if (sectors.includes(ANY_SECTOR)) sectors = [ANY_SECTOR];
  return { ok: true, value: { ...parsed.data, sectors, stages } };
}
