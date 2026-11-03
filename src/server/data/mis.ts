import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";

/**
 * Founders' MIS spreadsheets (service role). Every caller passes a startup id it has
 * already verified: the founder's own from the session, or any for requireAdmin().
 */

export interface MisFile {
  id: number;
  startup_id: number;
  file_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface MisFiles {
  files: MisFile[];
  /** False until MIGRATIONS/startup-mis.sql has been run. */
  ready: boolean;
}

const COLS = "id, startup_id, file_path, file_name, content_type, size_bytes, created_at";

/** Missing table (migration not run yet) or missing bucket. */
export function isMisNotReady(message?: string, code?: string): boolean {
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /bucket not found|does not exist|could not find the table/i.test(message ?? "")
  );
}

export async function listMisFiles(startupId: number): Promise<MisFiles> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("startup_mis_files")
    .select(COLS)
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    if (isMisNotReady(error.message, error.code)) return { files: [], ready: false };
    throw new Error(`Could not read startup_mis_files: ${error.code || error.message}`);
  }
  return { files: (data ?? []) as MisFile[], ready: true };
}

export async function getMisFile(id: number): Promise<MisFile | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("startup_mis_files").select(COLS).eq("id", id).maybeSingle();
  return (data as MisFile | null) ?? null;
}
