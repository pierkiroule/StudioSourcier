import { z } from "zod";
import type { Project, Stop } from "@sourciers/core";
export const ThemeSchema = z
  .object({
    name: z.string().max(80),
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    ink: z.string().regex(/^#[0-9a-f]{6}$/i),
    paper: z.string().regex(/^#[0-9a-f]{6}$/i),
    surface: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    font: z.enum(["sans", "serif"]),
    radius: z.number().min(0).max(32),
  })
  .strict();
export const AnimationSchema = z
  .object({
    density: z.number().int().min(3).max(18),
    speed: z.number().min(2).max(20),
    amplitude: z.number().min(0).max(30),
    thickness: z.number().min(0.5).max(5),
    paused: z.boolean(),
    customSvg: z.string().max(100000),
  })
  .strict();
export const BlockSchema = z
  .object({
    id: z.string().min(1).max(100),
    kind: z.enum([
      "title",
      "animation",
      "invitation",
      "seasons",
      "audio",
      "everyday",
      "text",
      "image",
    ]),
    visible: z.boolean(),
    text: z.string().max(8000).default(""),
    assetId: z.union([z.literal(""), z.uuid()]).default(""),
  })
  .strict();
export const LayoutSchema = z
  .object({
    width: z.enum(["narrow", "wide"]),
    align: z.enum(["left", "center"]),
    gap: z.number().min(8).max(48),
    blocks: z.array(BlockSchema).max(30),
  })
  .strict()
  .superRefine((v, c) => {
    if (new Set(v.blocks.map((b) => b.id)).size !== v.blocks.length)
      c.addIssue({
        code: "custom",
        message: "Identifiants de blocs dupliqués",
      });
  });
export const AppearanceSchema = z
  .object({
    version: z.literal("1.0.0"),
    theme: ThemeSchema,
    animation: AnimationSchema,
    overrides: z.record(z.string(), AnimationSchema),
    layouts: z.record(z.string(), LayoutSchema),
  })
  .strict();
export type Theme = z.infer<typeof ThemeSchema>;
export type Animation = z.infer<typeof AnimationSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
export type Appearance = z.infer<typeof AppearanceSchema>;
export const themes: Theme[] = [
  {
    name: "Sourciers · Sauge",
    primary: "#295d50",
    ink: "#203d36",
    paper: "#fafbf8",
    surface: "#ffffff",
    accent: "#b49454",
    font: "sans",
    radius: 18,
  },
  {
    name: "Brume · Heinlex",
    primary: "#406d87",
    ink: "#233c4c",
    paper: "#f2f7f8",
    surface: "#ffffff",
    accent: "#9a7a43",
    font: "sans",
    radius: 24,
  },
  {
    name: "Encre · Papier",
    primary: "#35434f",
    ink: "#232e35",
    paper: "#faf8f4",
    surface: "#ffffff",
    accent: "#985b3c",
    font: "serif",
    radius: 6,
  },
];
export const defaultAnimation = (): Animation => ({
  density: 7,
  speed: 9,
  amplitude: 12,
  thickness: 1.5,
  paused: false,
  customSvg: "",
});
export function defaultAppearance(): Appearance {
  return {
    version: "1.0.0",
    theme: { ...themes[0]! },
    animation: defaultAnimation(),
    overrides: {},
    layouts: {},
  };
}
export function appearanceOf(project: Project): Appearance {
  return project.extensions.appearance
    ? AppearanceSchema.parse(project.extensions.appearance)
    : defaultAppearance();
}
export function defaultLayout(): Layout {
  return {
    width: "narrow",
    align: "center",
    gap: 20,
    blocks: [
      "title",
      "animation",
      "invitation",
      "seasons",
      "audio",
      "everyday",
    ].map((kind) => ({
      id: kind,
      kind: BlockSchema.shape.kind.parse(kind),
      visible: true,
      text: "",
      assetId: "",
    })),
  };
}
export function layoutOf(appearance: Appearance, stopId: string): Layout {
  return appearance.layouts[stopId] ?? defaultLayout();
}
export function animationOf(
  appearance: Appearance,
  stopId?: string,
): Animation {
  return stopId
    ? (appearance.overrides[stopId] ?? appearance.animation)
    : appearance.animation;
}
export function withAppearance(project: Project, value: Appearance): Project {
  return {
    ...project,
    extensions: {
      ...project.extensions,
      appearance: AppearanceSchema.parse(value),
    },
  };
}
export function duplicateStop(stop: Stop): Stop {
  return {
    ...structuredClone(stop),
    id: crypto.randomUUID(),
    title: (stop.title + " · copie").slice(0, 160),
  };
}
export function reorder<T extends { id: string }>(
  items: readonly T[],
  id: string,
  target: string,
): T[] {
  const from = items.findIndex((i) => i.id === id),
    to = items.findIndex((i) => i.id === target);
  if (from < 0 || to < 0 || from === to) return [...items];
  const next = [...items];
  const item = next.splice(from, 1)[0]!;
  next.splice(to, 0, item);
  return next;
}
export function assetIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  function walk(v: unknown, key = "") {
    if (typeof v === "string") {
      if (/^asset:[0-9a-f-]{36}$/i.test(v)) ids.add(v.slice(6));
      if (key === "assetId" && v) ids.add(v);
    } else if (Array.isArray(v)) v.forEach((i) => walk(i));
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, i]) => walk(i, k));
  }
  walk(value);
  return ids;
}
