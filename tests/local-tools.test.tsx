import { it, expect } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  renderHook,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { createProject } from "@sourciers/core";
import {
  defaultAppearance,
  defaultAnimation,
  defaultLayout,
  withAppearance,
  appearanceOf,
  reorder,
  duplicateStop,
  validateSvg,
  generatedSvg,
  WorkshopProvider,
} from "@sourciers/studio-tools";
import { builtInCreations } from "../creations";
import {
  WorkspaceRepository,
  prepareAsset,
  repository,
  checkedProject,
} from "../apps/studio/src/local/repository";
import {
  exportWorkspace,
  inspectArchive,
  restoreWorkspace,
} from "../apps/studio/src/local/archive";
import { buildPlayerArchive } from "../apps/studio/src/local/publish";
import { useProjectHistory } from "../apps/studio/src/local/use-history";
import { App, registry } from "../apps/studio/src/App";
import { StopPlayer } from "../apps/player/src/Player";
const seed = () => builtInCreations[0]!.create();
const makeRepo = () => new WorkspaceRepository("test-" + crypto.randomUUID());
it("validates appearance versions and keeps layout reordering and clones independent", () => {
  const p = seed(),
    a = defaultAppearance(),
    stop = p.stops[0]!;
  a.layouts[stop.id] = defaultLayout();
  const next = reorder(a.layouts[stop.id]!.blocks, "invitation", "title");
  expect(next[0]!.kind).toBe("invitation");
  expect(a.layouts[stop.id]!.blocks[0]!.kind).toBe("title");
  const copy = duplicateStop(stop);
  copy.experience!.data.invitation = "Autre";
  expect(copy.id).not.toBe(stop.id);
  expect(stop.experience!.data.invitation).not.toBe("Autre");
  expect(appearanceOf(checkedProject(withAppearance(p, a)))).toEqual(a);
  expect(() =>
    checkedProject({
      ...p,
      extensions: { ...p.extensions, appearance: { ...a, version: "9.0.0" } },
    }),
  ).toThrow();
});
it("persists projects, media bytes, templates and immutable published versions after reopening", async () => {
  const repo = makeRepo(),
    p = seed(),
    asset = await prepareAsset(new File(["audio-test"], "chant.mp3"));
  p.stops[6]!.experience!.data.url = "asset:" + asset.id;
  await repo.addAsset(asset);
  await repo.save(p);
  await repo.saveTemplate({
    id: crypto.randomUUID(),
    name: "Sauge",
    kind: "theme",
    data: defaultAppearance().theme,
  });
  const snapshot = await repo.snapshot(p, "published", "Diffusion");
  p.title = "Brouillon modifié";
  await repo.save(p);
  await repo.close();
  expect((await repo.projects())[0]!.title).toBe("Brouillon modifié");
  expect(await (await repo.assets())[0]!.blob.text()).toBe("audio-test");
  expect((await repo.templates())[0]!.name).toBe("Sauge");
  expect(
    (await repo.snapshots()).find((s) => s.id === snapshot.id)!.project.title,
  ).not.toBe(p.title);
  await repo.close();
});
it("exports and restores a complete archive, verifies hashes, and rejects corrupt data before mutation", async () => {
  const source = makeRepo(),
    target = makeRepo(),
    p = seed(),
    asset = await prepareAsset(new File(["binary-audio"], "test.mp3"));
  p.stops[6]!.experience!.data.url = "asset:" + asset.id;
  await source.addAsset(asset);
  await source.save(p);
  await source.saveTemplate({
    id: crypto.randomUUID(),
    name: "Ondes",
    kind: "animation",
    data: defaultAnimation(),
  });
  await source.snapshot(p, "published", "Original");
  const bytes = await exportWorkspace(source);
  await restoreWorkspace(target, bytes);
  expect((await target.projects())[0]).toEqual(p);
  expect(await target.templates()).toHaveLength(1);
  expect(await (await target.assets())[0]!.blob.text()).toBe("binary-audio");
  const entries = unzipSync(bytes);
  entries["assets/" + asset.id] = strToU8("wrong bytes");
  await expect(restoreWorkspace(target, zipSync(entries))).rejects.toThrow(
    /incomplet|altéré/,
  );
  expect((await target.projects())[0]).toEqual(p);
  entries["../escape.txt"] = strToU8("bad");
  await expect(inspectArchive(zipSync(entries))).rejects.toThrow("inattendu");
  await source.close();
  await target.close();
});
it("preserves the replaced draft in a recovery snapshot on restore and aborts asset ID collisions atomically", async () => {
  const source = makeRepo(),
    target = makeRepo(),
    p = seed(),
    asset = await prepareAsset(new File(["first"], "same.mp3"));
  await source.addAsset(asset);
  await source.save(p);
  const data = await inspectArchive(await exportWorkspace(source));
  await target.save({ ...p, title: "Mon brouillon à conserver" });
  await target.restore(data);
  expect(
    (await target.snapshots()).some(
      (s) => s.project.title === "Mon brouillon à conserver",
    ),
  ).toBe(true);
  const other = await prepareAsset(new File(["other"], "same.mp3"));
  await target.addAsset({ ...other, id: asset.id });
  await expect(
    target.restore({
      ...data,
      projects: [{ ...p, title: "Ne doit pas être écrit" }],
    }),
  ).rejects.toThrow("contenu différent");
  expect((await target.projects())[0]!.title).toBe(p.title);
  await source.close();
  await target.close();
});
it("migrates legacy localStorage once without deleting the original or replacing an existing IndexedDB draft", async () => {
  const repo = makeRepo(),
    p = seed();
  localStorage.setItem("sourciers:current:v1", JSON.stringify(p));
  await repo.save({ ...p, title: "Déjà modifié" });
  await repo.migrateLegacy(localStorage);
  expect((await repo.projects())[0]!.title).toBe("Déjà modifié");
  expect(localStorage.getItem("sourciers:current:v1")).toBe(JSON.stringify(p));
  await repo.close();
});
it("accepts a self-contained animated SVG and rejects scripts, events and external references", () => {
  const source = generatedSvg(defaultAnimation());
  const clean = validateSvg(source);
  expect(clean).toContain("animateTransform");
  expect(validateSvg(source, true)).not.toContain("animateTransform");
  for (const bad of [
    "<script>alert(1)</script>",
    '<image href="https://example.org/a.svg"/>',
    '<circle onload="alert(1)"/>',
    "<foreignObject/>",
    '<animate attributeName="href" values="javascript:alert(1)"/>',
  ])
    expect(() =>
      validateSvg('<svg xmlns="http://www.w3.org/2000/svg">' + bad + "</svg>"),
    ).toThrow();
});
it("renders reordered and hidden visual blocks and resolves local audio without autoplay", () => {
  const p = seed(),
    a = defaultAppearance(),
    s = p.stops[6]!,
    assetId = crypto.randomUUID();
  s.experience!.data.url = "asset:" + assetId;
  a.layouts[s.id] = {
    ...defaultLayout(),
    blocks: [
      {
        id: "note",
        kind: "text",
        visible: true,
        text: "En premier",
        assetId: "",
      },
      ...defaultLayout().blocks.map((b) => ({
        ...b,
        visible: b.kind !== "invitation",
      })),
    ],
  };
  const view = render(
    <WorkshopProvider appearance={a} media={{ [assetId]: "blob:audio" }}>
      <StopPlayer stop={s} registry={registry} />
    </WorkshopProvider>,
  );
  expect(
    view.container
      .querySelector(".visual-block")
      ?.getAttribute("data-block-id"),
  ).toBe("note");
  expect(
    screen.queryByText(String(s.experience!.data.invitation)),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Écouter le paysage sonore")).toHaveAttribute(
    "src",
    "blob:audio",
  );
  expect(
    screen.getByLabelText("Écouter le paysage sonore"),
  ).not.toHaveAttribute("autoplay");
});
it("supports grouped undo/redo and clears redo after a fresh edit", () => {
  const p = createProject();
  const { result } = renderHook(() => useProjectHistory(p));
  act(() => {
    result.current.commit({ ...p, title: "A" }, "title");
    result.current.commit({ ...p, title: "AB" }, "title");
  });
  act(() => result.current.undo());
  expect(result.current.project.title).toBe(p.title);
  act(() => result.current.redo());
  expect(result.current.project.title).toBe("AB");
  act(() => result.current.undo());
  act(() => result.current.commit({ ...p, title: "New" }));
  expect(result.current.canRedo).toBe(false);
});
it("exports a real Player bundle with its media and stable stop QR codes", async () => {
  const p = seed(),
    asset = await prepareAsset(new File(["audio bytes"], "merle.mp3"));
  p.stops[6]!.experience!.data.url = "asset:" + asset.id;
  const request = (async (input: RequestInfo | URL) =>
    String(input).endsWith("index.html")
      ? new Response(
          '<html><head></head><body><script src="./assets/player.js"></script><script src="https://vercel.live/feedback.js"></script><script>window.injected=true</script></body></html>',
        )
      : new Response('console.log("player")')) as typeof fetch;
  const zip = unzipSync(
    await buildPlayerArchive(p, [asset], "https://example.org/lieu/", request),
  );
  expect(strFromU8(zip["media.json"]!)).toContain(asset.id);
  expect(strFromU8(zip["media/" + asset.id + ".mp3"]!)).toBe("audio bytes");
  expect(zip["qr/" + p.stops[6]!.id + ".svg"]).toBeDefined();
  expect(strFromU8(zip["index.html"]!)).toContain("manifest.webmanifest");
  expect(strFromU8(zip["index.html"]!)).not.toContain("vercel.live");
  expect(strFromU8(zip["index.html"]!)).not.toContain("window.injected");
  expect(zip["sw.js"]).toBeDefined();
  await expect(buildPlayerArchive(p, [], "", request)).rejects.toThrow(
    "média local",
  );
});
it("edits theme in the actual preview, saves a reusable model and prevents applying unsafe SVG", async () => {
  const user = userEvent.setup();
  const view = render(<App initialProject={seed()} />);
  await user.click(screen.getByRole("tab", { name: "Charte" }));
  fireEvent.change(screen.getByLabelText("Couleur principale"), {
    target: { value: "#123456" },
  });
  expect(view.container.querySelector(".journey-theme")).toHaveStyle(
    "--journey-primary: #123456",
  );
  await user.click(
    screen.getByRole("button", { name: "Enregistrer la charte comme modèle" }),
  );
  await waitFor(async () =>
    expect(await repository.templates()).toHaveLength(1),
  );
  await user.click(screen.getByRole("tab", { name: "Ondographe" }));
  await user.click(
    screen.getByText("Code SVG avancé", { selector: "summary" }),
  );
  fireEvent.change(screen.getByLabelText("Source SVG de l’Ondographe"), {
    target: { value: "<svg><script>alert(1)</script></svg>" },
  });
  await user.click(
    screen.getByRole("button", { name: "Valider et appliquer le SVG" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("non accepté");
  await user.click(
    screen.getByRole("button", { name: "Revenir à la source appliquée" }),
  );
  fireEvent.change(screen.getByLabelText("Source SVG de l’Ondographe"), {
    target: { value: generatedSvg(defaultAnimation()) },
  });
  await user.click(
    screen.getByRole("button", { name: "Valider et appliquer le SVG" }),
  );
  await waitFor(async () =>
    expect(
      appearanceOf((await repository.projects())[0]!).animation.customSvg,
    ).toContain("<svg"),
  );
});
it("creates a frozen version while subsequent edits only change the draft", async () => {
  const user = userEvent.setup();
  render(<App initialProject={seed()} />);
  await user.click(screen.getByRole("button", { name: "Publier" }));
  await user.click(
    screen.getByRole("button", { name: "Créer une version locale" }),
  );
  await screen.findByRole("button", { name: "Voir cette version" });
  await user.click(screen.getByRole("button", { name: "Atelier" }));
  fireEvent.change(screen.getByLabelText("Nom du parcours"), {
    target: { value: "Brouillon suivant" },
  });
  await waitFor(async () =>
    expect((await repository.projects())[0]!.title).toBe("Brouillon suivant"),
  );
  expect(
    (await repository.snapshots()).find((s) => s.kind === "published")!.project
      .title,
  ).toBe(seed().title);
});
