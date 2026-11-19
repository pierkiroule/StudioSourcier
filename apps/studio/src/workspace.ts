import { parseProject, serializeProject, type Project } from "@sourciers/core";
import { builtInCreations } from "../../../creations";
import { createStudioRegistry } from "../../registry";
const registry = createStudioRegistry();
export const ACTIVE_KEY = "sourciers:current:v1";
const PREFIX = "sourciers:project:";
export function loadCreation(slug: string): Project {
  const creation = builtInCreations.find((c) => c.slug === slug);
  if (!creation) throw Error("Création inconnue");
  const seed = registry.validateProject(creation.create());
  const saved = localStorage.getItem(PREFIX + seed.id);
  return saved
    ? registry.validateProject(parseProject(JSON.parse(saved)))
    : seed;
}
export function saveWorkspace(project: Project) {
  const json = serializeProject(
    registry.validateProject(parseProject(project)),
  );
  localStorage.setItem(PREFIX + project.id, json);
  localStorage.setItem(ACTIVE_KEY, json);
}
export function savedProjects(): Project[] {
  const projects: Project[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        projects.push(
          registry.validateProject(
            parseProject(JSON.parse(localStorage.getItem(key)!)),
          ),
        );
      } catch {
        /* Leave incompatible drafts untouched. */
      }
    }
  } catch {
    return [];
  }
  return projects;
}
export function loadWorkspace(): { project: Project; message: string } {
  const first = () => registry.validateProject(builtInCreations[0]!.create());
  try {
    const json = localStorage.getItem(ACTIVE_KEY);
    if (json) {
      const p = registry.validateProject(parseProject(JSON.parse(json)));
      const pristine =
        p.title === "Mon nouveau parcours" &&
        !p.description &&
        !p.stops.length &&
        !Object.keys(p.extensions).length;
      if (!pristine)
        return { project: p, message: "Brouillon local restauré." };
    }
    return {
      project: loadCreation(builtInCreations[0]!.slug),
      message: "Première création prête à explorer : Heinlex 2027.",
    };
  } catch {
    return {
      project: first(),
      message:
        "Un ancien brouillon n’a pas pu être ouvert. Il reste conservé sur cet appareil.",
    };
  }
}
