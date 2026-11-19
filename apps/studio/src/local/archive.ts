import { z } from "zod";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { assetIds, validateSvg } from "@sourciers/studio-tools";
import {
  AssetInfoSchema,
  checkedProject,
  checkedTemplate,
  sha256,
  type Asset,
  type Snapshot,
  type WorkspaceRepository,
} from "./repository";
const ManifestSchema = z
  .object({
    format: z.literal("sourciers-workspace"),
    version: z.literal(1),
    createdAt: z.iso.datetime(),
    active: z.string().optional(),
    projects: z.array(z.json()).max(200),
    assets: z.array(AssetInfoSchema).max(200),
    templates: z.array(z.json()).max(200),
    snapshots: z
      .array(
        z
          .object({
            id: z.uuid(),
            projectId: z.uuid(),
            project: z.json(),
            kind: z.enum(["revision", "published"]),
            createdAt: z.iso.datetime(),
            name: z.string().max(120),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict();
export async function exportWorkspace(
  repo: WorkspaceRepository,
): Promise<Uint8Array> {
  const [projects, assets, templates, snapshots, active] = await Promise.all([
    repo.projects(),
    repo.assets(),
    repo.templates(),
    repo.snapshots(),
    repo.active(),
  ]);
  const files: Record<string, Uint8Array> = {};
  let total = 0;
  for (const asset of assets) {
    total += asset.size;
    if (total > 200 * 1024 * 1024)
      throw Error("Cette sauvegarde dépasse 200 Mo.");
    files["assets/" + asset.id] = new Uint8Array(
      await asset.blob.arrayBuffer(),
    );
  }
  const manifest = {
    format: "sourciers-workspace",
    version: 1,
    createdAt: new Date().toISOString(),
    active,
    projects,
    assets: assets.map(({ blob, ...info }) => info),
    templates,
    snapshots,
  };
  ManifestSchema.parse(manifest);
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  return zipSync(files, { level: 0 });
}
export async function inspectArchive(bytes: Uint8Array) {
  if (bytes.byteLength > 220 * 1024 * 1024)
    throw Error("Archive trop volumineuse.");
  let size = 0,
    count = 0;
  const entries = unzipSync(bytes, {
    filter(info) {
      count++;
      size += info.originalSize;
      if (
        count > 202 ||
        size > 220 * 1024 * 1024 ||
        info.originalSize > 50 * 1024 * 1024
      )
        throw Error("Archive hors limites.");
      if (
        info.name !== "manifest.json" &&
        !/^assets\/[0-9a-f-]{36}$/i.test(info.name)
      )
        throw Error("Fichier inattendu dans l’archive.");
      return true;
    },
  });
  if (!entries["manifest.json"])
    throw Error("Ce fichier n’est pas une sauvegarde Sourciers.");
  const manifest = ManifestSchema.parse(
    JSON.parse(strFromU8(entries["manifest.json"])),
  );
  const projects = manifest.projects.map(checkedProject);
  if (new Set(projects.map((p) => p.id)).size !== projects.length)
    throw Error("Projets dupliqués");
  const templates = manifest.templates.map(checkedTemplate);
  const assets: Asset[] = [];
  for (const info of manifest.assets) {
    const bytes = entries["assets/" + info.id];
    if (!bytes || bytes.byteLength !== info.size)
      throw Error("Média manquant ou incomplet : " + info.name);
    const blob = new Blob([new Uint8Array(bytes)], { type: info.mime });
    if ((await sha256(blob)) !== info.hash)
      throw Error("Média altéré : " + info.name);
    if (info.mime === "image/svg+xml") validateSvg(await blob.text());
    assets.push({ ...info, blob });
  }
  if (new Set(assets.map((a) => a.id)).size !== assets.length)
    throw Error("Médias dupliqués");
  const snapshots: Snapshot[] = manifest.snapshots.map((s) => ({
    ...s,
    project: checkedProject(s.project),
  }));
  for (const s of snapshots)
    if (s.projectId !== s.project.id)
      throw Error("Identifiant de version incohérent");
  const known = new Set(assets.map((a) => a.id));
  for (const p of [
    ...projects,
    ...snapshots.map((s) => s.project),
    ...templates,
  ])
    for (const id of assetIds(p))
      if (!known.has(id))
        throw Error("Référence à un média absent de la sauvegarde.");
  if (manifest.active && !projects.some((p) => p.id === manifest.active))
    throw Error("Projet actif absent");
  return { projects, assets, templates, snapshots, active: manifest.active };
}
export async function restoreWorkspace(
  repo: WorkspaceRepository,
  bytes: Uint8Array,
) {
  const data = await inspectArchive(bytes);
  await repo.restore(data);
  return data;
}
export function downloadFile(
  content: Blob | Uint8Array,
  name: string,
  type = "application/zip",
) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([new Uint8Array(content)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
