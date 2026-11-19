import type { ComponentType, ReactNode } from "react";
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
  PlayerBlocks?: ComponentType<{
    data: Content;
    renderBlocks: (
      blocks: readonly { id: string; label: string; content: ReactNode }[],
    ) => ReactNode;
  }>;
}
export interface StudioModule {
  id: string;
  version: string;
  sdkVersion: typeof SDK_VERSION;
  label: string;
  experiences: readonly ExperienceDefinition[];
  projectSchema?: z.ZodType;
  ProjectEditor?: ComponentType<{
    data: Project["extensions"][string];
    onChange: (data: Project["extensions"][string]) => void;
  }>;
  ProjectIntro?: ComponentType<{ data: Project["extensions"][string] }>;
  ProjectFooter?: ComponentType<{ data: Project["extensions"][string] }>;
}
export class ModuleRegistry {
  private projectExtensions = new Map<string, z.ZodType>();
  registerProjectExtension(id: string, schema: z.ZodType) {
    if (!/^[a-z][a-z0-9-]*$/.test(id))
      throw Error("Identité d’extension invalide");
    if (this.list().some((m) => m.id === id))
      throw Error("Identifiant déjà utilisé par un module");
    if (this.projectExtensions.has(id))
      throw Error("Extension déjà enregistrée");
    this.projectExtensions.set(id, schema);
    return this;
  }
  private modules = new Map<string, StudioModule>();
  register(module: StudioModule) {
    if (this.projectExtensions.has(module.id))
      throw Error("Identifiant déjà utilisé par une extension");
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
  available() {
    const latest = new Map<string, StudioModule>();
    for (const module of this.list()) {
      const current = latest.get(module.id);
      if (
        !current ||
        module.version.localeCompare(current.version, undefined, {
          numeric: true,
        }) > 0
      )
        latest.set(module.id, module);
    }
    return [...latest.values()];
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
    for (const [id, data] of Object.entries(p.extensions)) {
      const tool = this.projectExtensions.get(id);
      if (tool) {
        tool.parse(data);
        continue;
      }
      const module = this.available().find((m) => m.id === id);
      if (!module?.projectSchema)
        throw Error("Extension de projet inconnue : " + id);
      module.projectSchema.parse(data);
    }
    for (const stop of p.stops)
      if (stop.experience) this.validate(stop.experience);
    return p;
  }
}
