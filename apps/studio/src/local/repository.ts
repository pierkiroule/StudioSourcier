import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { z } from "zod";
import { parseProject, type Project } from "@sourciers/core";
import {
  ThemeSchema,
  AnimationSchema,
  BlockSchema,
  AppearanceSchema,
  validateSvg,
} from "@sourciers/studio-tools";
import { createStudioRegistry } from "../../../registry";
const registry = createStudioRegistry();
export interface Asset {
  id: string;
  name: string;
  mime: string;
  size: number;
  hash: string;
  blob: Blob;
  createdAt: string;
}
export const AssetInfoSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(200),
    mime: z.enum([
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "audio/webm",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]),
    size: z
      .number()
      .int()
      .min(0)
      .max(50 * 1024 * 1024),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.iso.datetime(),
  })
  .strict();
export const TemplateSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120),
    kind: z.enum(["theme", "animation", "stop"]),
    data: z.json(),
  })
  .strict();
export type Template = z.infer<typeof TemplateSchema>;
export interface Snapshot {
  id: string;
  projectId: string;
  project: Project;
  kind: "revision" | "published";
  createdAt: string;
  name: string;
}
interface Database extends DBSchema {
  projects: { key: string; value: Project };
  assets: { key: string; value: Asset };
  templates: { key: string; value: Template };
  snapshots: { key: string; value: Snapshot };
  meta: { key: string; value: string };
}
export const DB_NAME = "sourciers-studio-local-v3";
export function checkedProject(value: unknown): Project {
  const p = registry.validateProject(parseProject(value));
  if (p.extensions.appearance) {
    const appearance = AppearanceSchema.parse(p.extensions.appearance);
    for (const a of [
      appearance.animation,
      ...Object.values(appearance.overrides),
    ]) {
      if (a.customSvg) validateSvg(a.customSvg);
    }
  }
  return p;
}
export function checkedTemplate(value: unknown): Template {
  const t = TemplateSchema.parse(value);
  if (t.kind === "theme") ThemeSchema.parse(t.data);
  else if (t.kind === "animation") {
    const a = AnimationSchema.parse(t.data);
    if (a.customSvg) validateSvg(a.customSvg);
  } else {
    const stop = z
      .object({ stop: z.json(), layout: z.array(BlockSchema).optional() })
      .parse(t.data);
    const p = parseProject({
      schemaVersion: "1.1.0",
      id: crypto.randomUUID(),
      title: "Modèle",
      description: "",
      updatedAt: new Date().toISOString(),
      stops: [stop.stop],
      relations: [],
      extensions: {},
    });
    registry.validateProject(p);
  }
  return t;
}
export async function sha256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
}
const accepted: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  webm: "audio/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};
export async function prepareAsset(file: File): Promise<Asset> {
  const mime = accepted[file.name.toLowerCase().split(".").at(-1) ?? ""];
  if (!mime)
    throw Error(
      "Choisissez un son MP3, WAV, OGG, M4A ou une image PNG, JPEG, WebP, SVG.",
    );
  if (file.size > 50 * 1024 * 1024)
    throw Error("La limite est de 50 Mo par fichier.");
  let blob: Blob = file;
  if (mime === "image/svg+xml")
    blob = new Blob([validateSvg(await file.text())], { type: mime });
  const asset = {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 200),
    mime,
    size: blob.size,
    blob,
    hash: await sha256(blob),
    createdAt: new Date().toISOString(),
  };
  const { blob: _blob, ...info } = asset;
  AssetInfoSchema.parse(info);
  return asset;
}
export class WorkspaceRepository {
  private database?: Promise<IDBPDatabase<Database>>;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly name = DB_NAME) {}
  db() {
    return (this.database ??= openDB<Database>(this.name, 1, {
      upgrade(db) {
        db.createObjectStore("projects", { keyPath: "id" });
        db.createObjectStore("assets", { keyPath: "id" });
        db.createObjectStore("templates", { keyPath: "id" });
        db.createObjectStore("snapshots", { keyPath: "id" });
        db.createObjectStore("meta");
      },
      blocking: () => {
        void this.close();
      },
    }));
  }
  async close() {
    const db = await this.database;
    db?.close();
    this.database = undefined;
  }
  async projects() {
    return (await (await this.db()).getAll("projects")).map(checkedProject);
  }
  async assets() {
    return (await this.db()).getAll("assets");
  }
  async templates() {
    return (await (await this.db()).getAll("templates")).map(checkedTemplate);
  }
  async snapshots(projectId?: string) {
    return (await (await this.db()).getAll("snapshots"))
      .filter((s) => !projectId || s.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async active() {
    return (await this.db()).get("meta", "active");
  }
  async save(project: Project) {
    const value = checkedProject(project);
    const write = async () => {
      const db = await this.db();
      const previous = await db.get("projects", value.id);
      const snapshots = (await this.snapshots(value.id)).filter(
        (s) => s.kind === "revision",
      );
      const tx = db.transaction(["projects", "meta", "snapshots"], "readwrite");
      if (
        previous &&
        (!snapshots[0] ||
          Date.now() - Date.parse(snapshots[0].createdAt) > 60000)
      ) {
        const snap: Snapshot = {
          id: crypto.randomUUID(),
          projectId: value.id,
          project: previous,
          kind: "revision",
          createdAt: new Date().toISOString(),
          name: "Sauvegarde automatique",
        };
        await tx.objectStore("snapshots").put(snap);
        for (const old of snapshots.slice(9))
          await tx.objectStore("snapshots").delete(old.id);
      }
      await tx.objectStore("projects").put(value);
      await tx.objectStore("meta").put(value.id, "active");
      await tx.done;
    };
    const job = this.queue.then(write, write);
    this.queue = job.catch(() => {});
    await job;
  }
  async addAsset(asset: Asset) {
    const { blob, ...info } = asset;
    AssetInfoSchema.parse(info);
    if (blob.size !== asset.size) throw Error("Fichier incomplet");
    await (await this.db()).put("assets", asset);
  }
  async saveTemplate(template: Template) {
    await (await this.db()).put("templates", checkedTemplate(template));
  }
  async snapshot(project: Project, kind: Snapshot["kind"], name: string) {
    const p = checkedProject(project);
    const snapshot: Snapshot = {
      id: crypto.randomUUID(),
      projectId: p.id,
      project: p,
      kind,
      createdAt: new Date().toISOString(),
      name: name.slice(0, 120),
    };
    await (await this.db()).put("snapshots", snapshot);
    return snapshot;
  }
  async migrateLegacy(storage: Storage) {
    const db = await this.db();
    if (await db.get("meta", "legacy-imported")) return;
    const entries = new Map<string, Project>();
    let active: string | undefined;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (
        key !== "sourciers:current:v1" &&
        !key?.startsWith("sourciers:project:")
      )
        continue;
      try {
        const p = checkedProject(JSON.parse(storage.getItem(key!)!));
        entries.set(p.id, p);
        if (key === "sourciers:current:v1") active = p.id;
      } catch {
        /* Keep original storage intact for recovery. */
      }
    }
    const tx = db.transaction(["projects", "meta"], "readwrite");
    for (const p of entries.values())
      if (!(await tx.objectStore("projects").get(p.id)))
        await tx.objectStore("projects").put(p);
    if (active && !(await tx.objectStore("meta").get("active")))
      await tx.objectStore("meta").put(active, "active");
    await tx.objectStore("meta").put("1", "legacy-imported");
    await tx.done;
  }
  async restore(data: {
    projects: Project[];
    assets: Asset[];
    templates: Template[];
    snapshots: Snapshot[];
    active?: string;
  }) {
    await this.queue;
    const db = await this.db();
    const tx = db.transaction(
      ["projects", "assets", "templates", "snapshots", "meta"],
      "readwrite",
    );
    for (const p of data.projects) {
      const previous = await tx.objectStore("projects").get(p.id);
      if (previous)
        await tx.objectStore("snapshots").put({
          id: crypto.randomUUID(),
          projectId: p.id,
          project: previous,
          createdAt: new Date().toISOString(),
          kind: "revision",
          name: "Avant restauration",
        });
      await tx.objectStore("projects").put(p);
    }
    for (const a of data.assets) {
      const previous = await tx.objectStore("assets").get(a.id);
      if (previous && previous.hash !== a.hash) {
        tx.abort();
        await tx.done.catch(() => {});
        throw Error(
          "Un média de même identifiant possède un contenu différent. Aucune restauration appliquée.",
        );
      }
      await tx.objectStore("assets").put(a);
    }
    for (const t of data.templates) await tx.objectStore("templates").put(t);
    for (const s of data.snapshots) await tx.objectStore("snapshots").put(s);
    if (data.active) await tx.objectStore("meta").put(data.active, "active");
    await tx.done;
  }
  async clearForTests() {
    const db = await this.db();
    for (const store of [
      "projects",
      "assets",
      "templates",
      "snapshots",
      "meta",
    ] as const)
      await db.clear(store);
  }
}
export const repository = new WorkspaceRepository();
