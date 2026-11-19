import { it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../apps/studio/src/App";
async function start(type: string) {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /Ajouter une escale/ }));
  await user.click(
    screen.getByRole("button", {
      name: new RegExp(type.split(" ")[0] + " " + type.split(" ")[1]),
    }),
  );
  return user;
}
it("in-situ: edits title, invitation and duration in the shared player", async () => {
  const user = await start(
    "Écoute in situ Ouvrir une parenthèse, là où l’on se trouve.",
  );
  fireEvent.change(screen.getByLabelText("Nom de l’escale"), {
    target: { value: "La clairière" },
  });
  fireEvent.change(screen.getByLabelText("Invitation à écouter"), {
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
  expect(
    JSON.parse(localStorage.getItem("sourciers:current:v1")!).stops[0].title,
  ).toBe("Escale 2");
});
it("audio: edits audio and transcript, refuses invalid URL without crashing", async () => {
  await start("Paysage audio Prolonger la rencontre par un enregistrement.");
  fireEvent.change(screen.getByLabelText(/Adresse du son/), {
    target: { value: "https://example.org/sound.mp3" },
  });
  fireEvent.change(screen.getByLabelText("Transcription accessible"), {
    target: { value: "Le chant du merle." },
  });
  expect(screen.getByLabelText("Écouter le paysage sonore")).toHaveAttribute(
    "src",
    "https://example.org/sound.mp3",
  );
  fireEvent.change(screen.getByLabelText(/Adresse du son/), {
    target: { value: "http://insecure.test/a.mp3" },
  });
  expect(screen.getByRole("button", { name: "Exporter JSON" })).toBeDisabled();
  expect(screen.getByLabelText(/Adresse du son/)).toBeVisible();
  expect(
    JSON.parse(localStorage.getItem("sourciers:current:v1")!).stops[0]
      .experience.data.url,
  ).toBe("https://example.org/sound.mp3");
});
it("seasonal: edits four seasons and switches each player state", async () => {
  const user = await start(
    "Écoute saisonnière Retrouver un lieu à travers ses quatre saisons.",
  );
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
it("imports valid JSON, rejects unsupported versions and confirms deletion", async () => {
  const user = await start(
    "Écoute in situ Ouvrir une parenthèse, là où l’on se trouve.",
  );
  const saved = localStorage.getItem("sourciers:current:v1")!;
  const input = screen.getByLabelText("Importer JSON");
  await user.upload(
    input,
    new File([saved], "test.json", { type: "application/json" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Escale 1" }),
  ).toBeVisible();
  await user.upload(
    input,
    new File(
      [JSON.stringify({ ...JSON.parse(saved), schemaVersion: "9.0.0" })],
      "bad.json",
      { type: "application/json" },
    ),
  );
  expect(await screen.findByText(/Import refusé/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Supprimer l’escale" }));
  await user.click(
    screen.getByRole("button", { name: "Confirmer la suppression" }),
  );
  expect(
    screen.queryByRole("heading", { name: "Escale 1" }),
  ).not.toBeInTheDocument();
});
it("restores a saved project on remount", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole("button", { name: /Ajouter une escale/ }));
  view.unmount();
  render(<App />);
  expect(within(screen.getByRole("list")).getByText("Escale 1")).toBeVisible();
});

it("creates a fresh project only after confirmation", async () => {
  const user = await start(
    "Écoute in situ Ouvrir une parenthèse, là où l’on se trouve.",
  );
  const previous = JSON.parse(localStorage.getItem("sourciers:current:v1")!).id;
  await user.click(screen.getByRole("button", { name: "Nouveau projet" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Annuler" }));
  expect(screen.getByRole("heading", { name: "Escale 1" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Nouveau projet" }));
  await user.click(screen.getByRole("button", { name: "Créer le projet" }));
  const fresh = JSON.parse(localStorage.getItem("sourciers:current:v1")!);
  expect(fresh.id).not.toBe(previous);
  expect(fresh.stops).toHaveLength(0);
});
