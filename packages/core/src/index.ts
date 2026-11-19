import { z } from "zod";
export const Version = z.string().regex(/^\d+\.\d+\.\d+$/);
export const ExperienceSchema = z
  .object({
    moduleId: z.string().min(1),
    moduleVersion: Version,
    type: z.string().min(1),
    data: z.record(z.string(), z.json()),
  })
  .strict();
export const StopSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    experience: ExperienceSchema.nullable(),
  })
  .strict();
export const ProjectSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(4000),
    updatedAt: z.iso.datetime(),
    stops: z.array(StopSchema),
    relations: z.array(
      z
        .object({
          from: z.uuid(),
          to: z.uuid(),
          kind: z.enum(["next", "related"]),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((p, ctx) => {
    const ids = new Set(p.stops.map((s) => s.id));
    if (ids.size !== p.stops.length)
      ctx.addIssue({
        code: "custom",
        message: "Identifiants d’escales dupliqués",
      });
    for (const r of p.relations)
      if (!ids.has(r.from) || !ids.has(r.to))
        ctx.addIssue({
          code: "custom",
          message: "Relation vers une escale absente",
        });
  });
export type Project = z.infer<typeof ProjectSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export function createProject(title = "Mon nouveau parcours"): Project {
  return {
    schemaVersion: "1.0.0",
    id: crypto.randomUUID(),
    title,
    description: "",
    updatedAt: new Date().toISOString(),
    stops: [],
    relations: [],
  };
}
export function addStop(p: Project, title = "Nouvelle escale"): Project {
  return {
    ...p,
    stops: [...p.stops, { id: crypto.randomUUID(), title, experience: null }],
  };
}
export function removeStop(p: Project, id: string): Project {
  return {
    ...p,
    stops: p.stops.filter((s) => s.id !== id),
    relations: p.relations.filter((r) => r.from !== id && r.to !== id),
  };
}
export function moveStop(p: Project, id: string, delta: -1 | 1): Project {
  const stops = [...p.stops];
  const i = stops.findIndex((s) => s.id === id);
  const dest = i + delta;
  if (i < 0 || dest < 0 || dest >= stops.length) return p;
  const item = stops.splice(i, 1)[0]!;
  stops.splice(dest, 0, item);
  return { ...p, stops };
}
// Explicit version boundary. Future migrations must be pure, chained and tested.
export function parseProject(value: unknown): Project {
  return ProjectSchema.parse(value);
}
export function serializeProject(p: Project): string {
  return JSON.stringify(parseProject(p), null, 2);
}
export interface ProjectRepository {
  save(project: Project): Promise<void>;
  load(id: string): Promise<Project | null>;
}
export class LocalProjectRepository implements ProjectRepository {
  constructor(
    private storage: Storage,
    private prefix = "sourciers:project:",
  ) {}
  async save(p: Project) {
    this.storage.setItem(this.prefix + p.id, serializeProject(p));
  }
  async load(id: string) {
    const s = this.storage.getItem(this.prefix + id);
    return s ? parseProject(JSON.parse(s)) : null;
  }
}
