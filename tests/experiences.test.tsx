import { it, expect } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createProject } from "@sourciers/core";
import { App } from "../apps/studio/src/App";
import { repository } from "../apps/studio/src/local/repository";
async function start(type: string) {
  const user = userEvent.setup();
  render(<App initialProject={createProject()} />);
  await user.click(screen.getByRole("button", { name: /Ajouter une escale/ }));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Type d’expérience" }),
    "soundscapes:" + type,
  );
  await user.click(
    screen.getByRole("button", { name: "Réglages complets du contenu" }),
  );
  return user;
}
it("in-situ edits invitation, title and duration in the real Player and reorders stops", async () => {
  const user = await start("in-situ");
  fireEvent.change(screen.getAllByLabelText("Nom de l’escale")[0]!, {
    target: { value: "La clairière" },
  });
  fireEvent.change(screen.getAllByLabelText("Invitation à écouter")[0]!, {
    target: { value: "Écoutez le vent." },
  });
  fireEvent.change(screen.getByLabelText("Durée indicative (secondes)"), {
    target: { value: "90" },
  });
  expect(screen.getByRole("heading", { name: "La clairière" })).toBeVisible();
  expect(screen.getByText("Écoutez le vent.", { selector: "p" })).toBeVisible();
  expect(screen.getByText(/90 secondes/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: /Ajouter une escale/ }));
  await user.click(screen.getByRole("button", { name: "Monter Escale 2" }));
  await waitFor(async () =>
    expect((await repository.projects())[0]!.stops[0]!.title).toBe("Escale 2"),
  );
});
it("audio keeps invalid URL editable, preserves last valid saved project and disables export", async () => {
  await start("audio");
  fireEvent.change(screen.getByLabelText(/Adresse du son/), {
    target: { value: "https://example.org/sound.mp3" },
  });
  fireEvent.change(screen.getByLabelText("Transcription accessible"), {
    target: { value: "Le merle." },
  });
  expect(screen.getByLabelText("Écouter le paysage sonore")).toHaveAttribute(
    "src",
    "https://example.org/sound.mp3",
  );
  await waitFor(async () =>
    expect(
      (await repository.projects())[0]!.stops[0]!.experience!.data.url,
    ).toBe("https://example.org/sound.mp3"),
  );
  fireEvent.change(screen.getByLabelText(/Adresse du son/), {
    target: { value: "http://insecure.test/a.mp3" },
  });
  expect(
    screen.getByRole("button", { name: "Sauvegarder un fichier" }),
  ).toBeDisabled();
  expect(screen.getByLabelText(/Adresse du son/)).toBeVisible();
  expect((await repository.projects())[0]!.stops[0]!.experience!.data.url).toBe(
    "https://example.org/sound.mp3",
  );
});
it("seasonal edits four seasons and switches each Player state", async () => {
  const user = await start("seasonal");
  for (const season of ["Printemps", "Été", "Automne", "Hiver"]) {
    fireEvent.change(screen.getByLabelText("Son · " + season), {
      target: {
        value: "https://example.org/" + encodeURIComponent(season) + ".mp3",
      },
    });
    fireEvent.change(screen.getByLabelText("Texte · " + season), {
      target: { value: "Rencontre " + season },
    });
    await user.click(screen.getByRole("button", { name: season }));
    expect(
      screen.getByText("Rencontre " + season, { selector: "p" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Écouter le paysage sonore")).toHaveAttribute(
      "src",
      "https://example.org/" + encodeURIComponent(season) + ".mp3",
    );
  }
});
it("confirms deletion and supports undo/redo without losing the stop", async () => {
  const user = await start("in-situ");
  await user.click(screen.getByRole("button", { name: "Supprimer l’escale" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirmer la suppression",
    }),
  );
  expect(
    screen.queryByRole("heading", { name: "Escale 1" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Annuler" }));
  expect(
    within(screen.getByRole("list", { name: "Escales" })).getByText("Escale 1"),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Rétablir" }));
  expect(
    within(screen.getByRole("list", { name: "Escales" })).queryByText(
      "Escale 1",
    ),
  ).not.toBeInTheDocument();
});
it("restores a saved project on remount", async () => {
  const user = userEvent.setup();
  const p = createProject("Mon projet");
  const view = render(<App initialProject={p} />);
  await user.click(screen.getByRole("button", { name: /Ajouter une escale/ }));
  await waitFor(async () =>
    expect(
      (await repository.projects()).find((v) => v.id === p.id)!.stops,
    ).toHaveLength(1),
  );
  view.unmount();
  render(<App />);
  expect(await screen.findByLabelText("Nom du parcours")).toHaveValue(
    "Mon projet",
  );
  expect(
    within(screen.getByRole("list", { name: "Escales" })).getByText("Escale 1"),
  ).toBeVisible();
});
it("creates an independent project and retains the previous creation", async () => {
  const user = await start("in-situ");
  const previous = (await repository.projects())[0]!.id;
  await user.click(screen.getByRole("button", { name: "Créations" }));
  await user.click(screen.getByRole("button", { name: "Nouveau projet" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Nom du parcours")).toHaveValue(
      "Mon nouveau parcours",
    ),
  );
  await waitFor(async () =>
    expect(await repository.projects()).toHaveLength(2),
  );
  expect(
    (await repository.projects()).find((p) => p.id === previous)!.stops,
  ).toHaveLength(1);
});
