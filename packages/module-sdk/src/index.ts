import type { ComponentType } from "react";
import { z } from "zod";
import { Version, type Experience, type Project } from "@sourciers/core";
export const SDK_VERSION = "1.0.0" as const;
export type Content = Experience["data"];
export interface ExperienceDefinition {
  type: string;
  label: string;
  description: string;
  glyph: string;
  schema: z.ZodType<Content>;
  defaults: () => Content;
  Editor: ComponentType<{ data: Content; onChange: (data: Content) => void }>;
  Player: ComponentType<{ data: Content }>;
}
export interface StudioModule {
  id: string;
  version: string;
  sdkVersion: typeof SDK_VERSION;
  label: string;
  experiences: readonly ExperienceDefinition[];
}
export class ModuleRegistry {
  private modules = new Map<string, StudioModule>();
  register(module: StudioModule) {
    if (
      !/^[a-z][a-z0-9-]*$/.test(module.id) ||
      !Version.safeParse(module.version).success
    )
      throw Error("Identité du module invalide");
    if (module.sdkVersion !== SDK_VERSION)
      throw Error("Version SDK incompatible");
    const key = module.id + "@" + module.version;
    if (this.modules.has(key)) throw Error("Module déjà enregistré");
    const types = new Set<string>();
    for (const e of module.experiences) {
      if (types.has(e.type)) throw Error("Type dupliqué");
      types.add(e.type);
      e.schema.parse(e.defaults());
    }
    this.modules.set(key, module);
    return this;
  }
  list() {
    return [...this.modules.values()];
  }
  resolve(e: Experience) {
    const m = this.modules.get(e.moduleId + "@" + e.moduleVersion);
    if (!m)
      throw Error(
        "Module absent ou version incompatible : " +
          e.moduleId +
          "@" +
          e.moduleVersion,
      );
    const def = m.experiences.find((d) => d.type === e.type);
    if (!def) throw Error("Expérience inconnue : " + e.type);
    return def;
  }
  validate(e: Experience) {
    this.resolve(e).schema.parse(e.data);
    return e;
  }
  validateProject(p: Project) {
    for (const stop of p.stops)
      if (stop.experience) this.validate(stop.experience);
    return p;
  }
}
