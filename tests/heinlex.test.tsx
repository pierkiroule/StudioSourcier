import { afterEach, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createProject,
  parseProject,
  serializeProject,
  removeStop,
  moveStop,
} from "@sourciers/core";
import { builtInCreations } from "../creations";
import { createStudioRegistry } from "../apps/registry";
import { App } from "../apps/studio/src/App";
import { ProjectPlayer, StopPlayer } from "../apps/player/src/Player";
import {
  loadWorkspace,
  saveWorkspace,
  loadCreation,
} from "../apps/studio/src/workspace";
import {
  nextSurpriseIndex,
  toggleFeedbackTag,
  soundscapesModuleV11,
} from "@sourciers/soundscapes";
const registry = createStudioRegistry();
const seed = () => builtInCreations[0]!.create();
afterEach(() => history.replaceState(null, "", location.pathname));
it("loads the complete 6+6+1 storyboard with all four seasonal texts and no invented media", () => {
  const p = registry.validateProject(seed());
  expect(p.stops).toHaveLength(13);
  expect(p.stops.map((s) => s.experience!.type)).toEqual([
    ...Array<string>(6).fill("in-situ"),
    ...Array<string>(6).fill("seasonal"),
    "surprise",
  ]);
  expect(p.stops[0]!.experience!.data.invitation).toBe(
    "Laissez venir les sons proches. Votre attention peut ensuite s’élargir vers un son plus éloigné, puis revenir près de vous. Rien n’oblige à tout entendre.",
  );
  for (const stop of p.stops.slice(6, 12)) {
    const d = stop.experience!.data;
    expect(d.url).toBe("");
    expect(
      Object.values(d.notes as Record<string, string>).every(Boolean),
    ).toBe(true);
  }
  expect(p.stops[12]!.experience!.data.collection).toEqual([]);
  expect(parseProject(JSON.parse(serializeProject(p)))).toEqual(p);
});
it("migrates V1 project documents, retains exact legacy module versions and rejects future schemas", () => {
  const old = { ...createProject(), schemaVersion: "1.0.0" };
  const { extensions: _extensions, ...legacy } = old;
  expect(parseProject(legacy).schemaVersion).toBe("1.1.0");
  expect(parseProject(legacy).extensions).toEqual({});
  expect(() => parseProject({ ...legacy, schemaVersion: "8.0.0" })).toThrow();
  expect(registry.available()).toHaveLength(1);
  expect(registry.available()[0]!.version).toBe("1.1.0");
  expect(
    registry.resolve({
      moduleId: "soundscapes",
      moduleVersion: "1.0.0",
      type: "audio",
      data: { invitation: "", url: "", transcript: "" },
    }).type,
  ).toBe("audio");
});
it("opens Heinlex on first visit and preserves an existing authored draft", () => {
  expect(loadWorkspace().project.stops).toHaveLength(13);
  const p = createProject("Mon autre création");
  saveWorkspace(p);
  expect(loadWorkspace().project.id).toBe(p.id);
  expect(loadCreation("heinlex-2027").stops).toHaveLength(13);
  const edited = seed();
  edited.stops[0]!.title = "Mon texte à moi";
  saveWorkspace(edited);
  expect(loadCreation("heinlex-2027").stops[0]!.title).toBe("Mon texte à moi");
  expect(seed().stops[0]!.title).toBe("Les sons lointains");
});
it("loads the first creation into the Studio, edits it, and previews the actual draft", async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByLabelText("Nom du parcours")).toHaveValue(
    "Heinlex 2027 •° — Oreillez-vous !",
  );
  expect(
    within(screen.getByRole("list")).getAllByRole("listitem"),
  ).toHaveLength(13);
  fireEvent.change(screen.getByLabelText("Nom de l’escale"), {
    target: { value: "Mon écoute lointaine" },
  });
  expect(
    JSON.parse(localStorage.getItem("sourciers:current:v1")!).stops[0].title,
  ).toBe("Mon écoute lointaine");
  await user.click(screen.getByRole("button", { name: "Parcourir le projet" }));
  expect(screen.getByRole("navigation", { name: "Escales" })).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: /Mon écoute lointaine/ }),
  );
  expect(
    screen.getByRole("heading", { name: "Mon écoute lointaine" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Retour aux 13 bornes" }),
  ).toBeVisible();
});
it("opens the prepared creation without losing the existing project", async () => {
  const user = userEvent.setup();
  const p = createProject("Création à conserver");
  render(<App initialProject={p} />);
  await user.click(
    screen.getByRole("button", { name: "Ouvrir dans le Studio" }),
  );
  expect(screen.getByLabelText("Nom du parcours")).toHaveValue(seed().title);
  expect(localStorage.getItem("sourciers:project:" + p.id)).toContain(
    "Création à conserver",
  );
});
it("uses a primary recording across seasons, renders the appropriate texts and exposes no internal learning notes", async () => {
  const user = userEvent.setup();
  const p = seed();
  const stop = p.stops[6]!;
  stop.experience!.data.url = "https://example.org/main.mp3";
  render(<StopPlayer stop={stop} registry={registry} />);
  await user.click(screen.getByRole("button", { name: "Printemps" }));
  expect(screen.getByLabelText("Écouter le paysage sonore")).toHaveAttribute(
    "src",
    "https://example.org/main.mp3",
  );
  expect(
    screen.getByText(
      "Suivez une voix : comment commence-t-elle, se répète-t-elle ou s’interrompt-elle ?",
    ),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Hiver" }));
  expect(screen.getByLabelText("Écouter le paysage sonore")).toHaveAttribute(
    "src",
    "https://example.org/main.mp3",
  );
  expect(
    screen.getByText(
      "Entre deux voix, écoutez aussi les pauses et l’espace qui les sépare.",
    ),
  ).toBeVisible();
  expect(
    screen.queryByText(
      "Développer sa disponibilité au dialogue et à l’alternance.",
    ),
  ).not.toBeInTheDocument();
});
it("offers surprise discovery without autoplay or immediate repeats and validates its defaults", async () => {
  const user = userEvent.setup();
  const p = seed();
  const stop = p.stops[12]!;
  stop.experience!.data.collection = [
    {
      id: crypto.randomUUID(),
      title: "Une première écoute",
      url: "https://example.org/first.mp3",
      description: "Premier paysage.",
      credits: "",
    },
    {
      id: crypto.randomUUID(),
      title: "Une autre présence",
      url: "https://example.org/second.mp3",
      description: "Autre paysage.",
      credits: "",
    },
  ];
  registry.validateProject(p);
  render(<StopPlayer stop={stop} registry={registry} />);
  expect(
    screen.queryByLabelText("Écouter le paysage sonore"),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Découvrir une écoute" }),
  );
  const first = screen
    .getByLabelText("Écouter le paysage sonore")
    .getAttribute("src");
  expect(
    screen.getByLabelText("Écouter le paysage sonore"),
  ).not.toHaveAttribute("autoplay");
  await user.click(screen.getByRole("button", { name: "Une autre écoute" }));
  expect(
    screen.getByLabelText("Écouter le paysage sonore").getAttribute("src"),
  ).not.toBe(first);
  expect(nextSurpriseIndex(0, 0)).toBe(-1);
  expect(nextSurpriseIndex(1, 0)).toBe(0);
  for (const def of soundscapesModuleV11.experiences)
    expect(def.schema.safeParse(def.defaults()).success).toBe(true);
});
it("opens a stable stop link after reordering and handles deleted stop IDs", () => {
  const p = moveStop(seed(), seed().stops[12]!.id, -1);
  const id = p.stops[6]!.id;
  location.hash = "escale=" + id;
  const view = render(<ProjectPlayer project={p} registry={registry} />);
  expect(
    screen.getByRole("heading", { name: "Les voix des oiseaux" }),
  ).toBeVisible();
  view.unmount();
  render(<ProjectPlayer project={removeStop(p, id)} registry={registry} />);
  expect(screen.getByRole("navigation", { name: "Escales" })).toBeVisible();
});
it("keeps feedback optional, exclusive choices consistent and prevents false sending", async () => {
  const user = userEvent.setup();
  render(<ProjectPlayer project={seed()} registry={registry} />);
  await user.click(
    screen.getByText("Partager mon retour", { selector: "summary" }),
  );
  expect(
    screen.getByRole("button", { name: "Envoi non configuré" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "J’ai écouté autrement." }),
  );
  await user.click(
    screen.getByRole("button", {
      name: "Je n’en retiens rien de particulier.",
    }),
  );
  expect(
    screen.getByRole("button", { name: "J’ai écouté autrement." }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(toggleFeedbackTag([0, 7], 6, 6)).toEqual([7, 6]);
  expect(toggleFeedbackTag([6, 7], 2, 6)).toEqual([7, 2]);
  expect(
    screen.getByRole("textbox", {
      name: "Quelques mots, si vous le souhaitez…",
    }),
  ).toHaveValue("");
});

it("requires confirmation to reload the version from code and restores the source content", async () => {
  const user = userEvent.setup();
  render(<App />);
  fireEvent.change(screen.getByLabelText("Nom de l’escale"), {
    target: { value: "Une modification locale" },
  });
  await user.click(
    screen.getByRole("button", { name: "Recharger la version du code" }),
  );
  await user.click(screen.getByRole("button", { name: "Annuler" }));
  expect(screen.getByLabelText("Nom de l’escale")).toHaveValue(
    "Une modification locale",
  );
  await user.click(
    screen.getByRole("button", { name: "Recharger la version du code" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Recharger le parcours" }),
  );
  expect(screen.getByLabelText("Nom de l’escale")).toHaveValue(
    "Les sons lointains",
  );
});
it("makes every track eligible for the initial surprise and never immediately repeats", () => {
  expect(nextSurpriseIndex(3, -1, () => 0)).toBe(0);
  expect(nextSurpriseIndex(3, -1, () => 0.999)).toBe(2);
  for (let current = 0; current < 3; current++) {
    expect(nextSurpriseIndex(3, current, () => 0)).not.toBe(current);
    expect(nextSurpriseIndex(3, current, () => 0.999)).not.toBe(current);
  }
});
