import { parseProject, type Project } from "@sourciers/core";
import heinlex from "./heinlex-2027/project.json";
export interface BuiltInCreation {
  slug: string;
  label: string;
  summary: string;
  revision: string;
  create: () => Project;
}
export const builtInCreations: readonly BuiltInCreation[] = [
  {
    slug: "heinlex-2027",
    label: "Heinlex 2027 •° — Oreillez-vous !",
    summary: "13 bornes · 6 sur place · 6 saisonnières · 1 surprise",
    revision: "Storyboard V0.4 · textes proposés",
    create: () => parseProject(structuredClone(heinlex)),
  },
];
