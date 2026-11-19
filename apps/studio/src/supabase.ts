import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  parseProject,
  type Project,
  type ProjectRepository,
} from "@sourciers/core";
export function configuredSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;
  if (!url && !key) return null;
  if (!url || !key) throw Error("Configuration Supabase incomplète");
  if (new URL(url).protocol !== "https:") throw Error("Supabase exige HTTPS");
  return createClient(url, key);
}
export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private client: SupabaseClient) {}
  async save(project: Project) {
    const p = parseProject(project);
    const {
      data: { user },
      error: authError,
    } = await this.client.auth.getUser();
    if (authError || !user) throw Error("Connexion Supabase requise");
    const { error } = await this.client.from("projects").upsert({
      id: p.id,
      owner_id: user.id,
      title: p.title,
      schema_version: p.schemaVersion,
      document: p,
      updated_at: p.updatedAt,
    });
    if (error) throw error;
  }
  async load(id: string) {
    const { data, error } = await this.client
      .from("projects")
      .select("document")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? parseProject(data.document) : null;
  }
}
