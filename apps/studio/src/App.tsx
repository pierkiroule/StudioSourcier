import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createProject,
  addStop,
  removeStop,
  moveStop,
  serializeProject,
  type Project,
  type Stop,
} from "@sourciers/core";
import { Brand, Field } from "@sourciers/design-system";
import {
  WorkshopProvider,
  appearanceOf,
  withAppearance,
  layoutOf,
  defaultLayout,
  duplicateStop,
  reorder,
  ThemeSchema,
  AnimationSchema,
  LayoutSchema,
  animationOf,
  generatedSvg,
  assetIds,
  type Appearance,
  type Animation,
  type Block,
} from "@sourciers/studio-tools";
import { StopPlayer, ProjectPlayer } from "../../player/src/Player";
import { builtInCreations } from "../../../creations";
import { createStudioRegistry } from "../../registry";
import { loadWorkspace } from "./workspace";
import {
  repository,
  checkedProject,
  prepareAsset,
  type Asset,
  type Template,
  type Snapshot,
} from "./local/repository";
import { exportWorkspace, inspectArchive, downloadFile } from "./local/archive";
import { buildPlayerArchive } from "./local/publish";
import { useProjectHistory } from "./local/use-history";
import { TextField, blockLabels } from "./tools/fields";
import { ThemeTools } from "./tools/ThemeTools";
import { AnimationTools } from "./tools/AnimationTools";
import { BlockTools } from "./tools/BlockTools";
import { SortableList } from "./SortableList";
export const registry = createStudioRegistry();
type Screen = "creations" | "atelier" | "publier" | "preview";
type Inspector = "contenu" | "charte" | "animation" | "blocs";
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el?.showModal) el.showModal();
    else el?.setAttribute("open", "");
  }, []);
  return (
    <dialog
      className="pro-dialog"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <h2>{title}</h2>
      {children}
      <button onClick={onClose}>Annuler</button>
    </dialog>
  );
}
export function App({ initialProject }: { initialProject?: Project } = {}) {
  const [seed] = useState(() => initialProject ?? loadWorkspace().project);
  const history = useProjectHistory(seed);
  const { project, commit, reset, undo, redo, canUndo, canRedo } = history;
  const [ready, setReady] = useState(!!initialProject);
  const [screen, setScreen] = useState<Screen>("atelier");
  const [inspector, setInspector] = useState<Inspector>("contenu");
  const [mobilePane, setMobilePane] = useState<
    "structure" | "scene" | "reglages"
  >("scene");
  const [selected, setSelected] = useState<string | undefined>(
    seed.stops[0]?.id,
  );
  const [selectedBlock, setSelectedBlock] = useState("invitation");
  const [device, setDevice] = useState<"mobile" | "large">("mobile");
  const [fullSettings, setFullSettings] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<
    "saving" | "saved" | "invalid" | "error"
  >("saving");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    body: string;
    confirm: () => Promise<void> | void;
    label: string;
  }>();
  const [scope, setScope] = useState<"project" | "stop">("project");
  const [svgDraft, setSvgDraft] = useState("");
  const [svgDirty, setSvgDirty] = useState(false);
  const [svgError, setSvgError] = useState("");
  const [publicationAddress, setPublicationAddress] = useState("");
  const [previewProject, setPreviewProject] = useState<Project>();
  const sequence = useRef(0);
  const appearance = appearanceOf(project);
  const stop = project.stops.find((s) => s.id === selected);
  const layout = stop ? layoutOf(appearance, stop.id) : defaultLayout();
  const block = layout.blocks.find((b) => b.id === selectedBlock);
  const animation = animationOf(
    appearance,
    scope === "stop" ? stop?.id : undefined,
  );
  const definition = stop?.experience
    ? registry.resolve(stop.experience)
    : null;
  let valid = true;
  try {
    checkedProject(project);
  } catch {
    valid = false;
  }
  const refresh = useCallback(async () => {
    const [p, a, t, s] = await Promise.all([
      repository.projects(),
      repository.assets(),
      repository.templates(),
      repository.snapshots(),
    ]);
    setProjects(p);
    setAssets(a);
    setTemplates(t);
    setSnapshots(s);
  }, []);
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cette opération n’a pas abouti.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await repository.migrateLegacy(localStorage);
        if (!initialProject) {
          const p = await repository.projects();
          const id = await repository.active();
          const active = p.find((p) => p.id === id) ?? seed;
          if (alive) {
            reset(active);
            setSelected(active.stops[0]?.id);
          }
        }
        await refresh();
        if (navigator.storage?.persisted) {
          const value = await navigator.storage.persisted();
          if (alive) setPersistent(value);
        }
        if (alive) setReady(true);
      } catch (error) {
        if (alive) {
          setMessage(
            "Le stockage local ne peut pas être ouvert. Exportez votre travail avant de quitter. " +
              (error instanceof Error ? error.message : ""),
          );
          setReady(true);
          setSaveState("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialProject, refresh, reset, seed]);
  useEffect(() => {
    if (!ready) return;
    const n = ++sequence.current;
    if (!valid) {
      setSaveState("invalid");
      return;
    }
    setSaveState("saving");
    void repository
      .save(project)
      .then(() => {
        if (n === sequence.current) {
          setSaveState("saved");
          setProjects((p) => [
            project,
            ...p.filter((i) => i.id !== project.id),
          ]);
        }
      })
      .catch((error) => {
        if (n === sequence.current) {
          setSaveState("error");
          setMessage(
            "La sauvegarde locale a échoué. Exportez une copie : " +
              String(error),
          );
        }
      });
  }, [project, ready, valid]);
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const asset of assets)
      urls[asset.id] = URL.createObjectURL(asset.blob);
    setMedia(urls);
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [assets]);
  useEffect(() => {
    if (!svgDirty)
      setSvgDraft(
        animation.customSvg ||
          generatedSvg(animation, appearance.theme.primary),
      );
  }, [animation, appearance.theme.primary, svgDirty]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        saveState === "saving" ||
        saveState === "invalid" ||
        saveState === "error" ||
        svgDirty
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState, svgDirty]);
  const updateAppearance = (next: Appearance, key = "appearance") =>
    commit(withAppearance(project, next), key);
  const updateStop = (patch: Partial<Stop>) => {
    if (stop)
      commit(
        {
          ...project,
          stops: project.stops.map((s) =>
            s.id === stop.id ? { ...s, ...patch } : s,
          ),
        },
        "content-" + stop.id,
      );
  };
  const updateData = (
    patch: Record<string, NonNullable<Stop["experience"]>["data"][string]>,
  ) => {
    if (stop?.experience)
      updateStop({
        experience: {
          ...stop.experience,
          data: { ...stop.experience.data, ...patch },
        },
      });
  };
  const updateLayout = (next: typeof layout) => {
    if (stop)
      updateAppearance(
        { ...appearance, layouts: { ...appearance.layouts, [stop.id]: next } },
        "layout-" + stop.id,
      );
  };
  const updateAnimation = (next: Animation) => {
    if (scope === "stop" && stop)
      updateAppearance(
        {
          ...appearance,
          overrides: { ...appearance.overrides, [stop.id]: next },
        },
        "animation-" + stop.id,
      );
    else
      updateAppearance({ ...appearance, animation: next }, "animation-project");
  };
  const choose = (id?: string) => {
    if (svgDirty) {
      setMessage(
        "Appliquez ou abandonnez la source SVG avant de changer d’escale.",
      );
      return;
    }

    setSelected(id);
    setSelectedBlock("invitation");
    setFullSettings(false);
    setSvgError("");
  };
  const open = async (p: Project) => {
    if (svgDirty)
      throw Error(
        "Appliquez ou abandonnez la source SVG avant de changer de création.",
      );
    if (!valid)
      throw Error(
        "Corrigez les champs ou annulez vos modifications avant de changer de création.",
      );
    await repository.save(project);
    reset(checkedProject(p));
    choose(p.stops[0]?.id);
    setScreen("atelier");
    setPreviewProject(undefined);
    setMessage("Création ouverte.");
  };
  const confirm = (
    title: string,
    body: string,
    label: string,
    action: () => Promise<void> | void,
  ) => setDialog({ title, body, label, confirm: action });
  const importFile = (file: File) =>
    void run(async () => {
      if (file.size > 220 * 1024 * 1024)
        throw Error("Le fichier dépasse 220 Mo.");
      if (file.name.toLowerCase().endsWith(".zip")) {
        const data = await inspectArchive(
          new Uint8Array(await file.arrayBuffer()),
        );
        confirm(
          "Restaurer cette sauvegarde ?",
          `${data.projects.length} projet(s), ${data.assets.length} média(s), ${data.templates.length} modèle(s). Les versions remplacées seront conservées dans l’historique. Les autres projets restent présents.`,
          "Restaurer la sauvegarde",
          async () => {
            await repository.restore(data);
            await refresh();
            const p =
              data.projects.find((p) => p.id === data.active) ??
              data.projects[0];
            if (p) {
              reset(p);
              choose(p.stops[0]?.id);
            }
            setMessage("Sauvegarde restaurée et vérifiée.");
            setScreen("atelier");
          },
        );
      } else {
        const p = checkedProject(JSON.parse(await file.text()));
        const known = new Set(assets.map((a) => a.id));
        if ([...assetIds(p)].some((id) => !known.has(id)))
          throw Error(
            "Ce JSON référence des médias absents. Importez la sauvegarde complète ZIP.",
          );
        confirm(
          "Importer ce projet ?",
          p.title +
            " · " +
            p.stops.length +
            " escales. Un JSON seul ne contient pas les fichiers médias.",
          "Importer le projet",
          async () => {
            await repository.snapshot(project, "revision", "Avant import");
            await open(p);
          },
        );
      }
    });
  const addFiles = (files: FileList | null, assign = false) => {
    if (!files?.length) return;
    void run(async () => {
      const added: Asset[] = [];
      for (const file of Array.from(files)) {
        const asset = await prepareAsset(file);
        await repository.addAsset(asset);
        added.push(asset);
      }
      await refresh();
      if (assign && stop?.experience && added[0]) {
        const asset = added[0];
        if (asset.mime.startsWith("image/")) {
          const b: Block = {
            id: crypto.randomUUID(),
            kind: "image",
            visible: true,
            text: asset.name,
            assetId: asset.id,
          };
          updateLayout({ ...layout, blocks: [...layout.blocks, b] });
          setSelectedBlock(b.id);
          setInspector("blocs");
        } else if (stop.experience.type === "surprise") {
          const collection = Array.isArray(stop.experience.data.collection)
            ? stop.experience.data.collection
            : [];
          updateData({
            collection: [
              ...collection,
              {
                id: crypto.randomUUID(),
                title: asset.name,
                url: "asset:" + asset.id,
                description: "",
                credits: "",
              },
            ],
          });
        } else if (["audio", "seasonal"].includes(stop.experience.type))
          updateData({ url: "asset:" + asset.id });
        else
          setMessage(
            "Média conservé dans la bibliothèque. Choisissez une expérience audio pour l’associer.",
          );
      }
      setMessage(added.length + " fichier(s) enregistré(s) sur cet appareil.");
    });
  };
  const duplicate = () => {
    if (!stop) return;
    const copy = duplicateStop(stop);
    const i = project.stops.indexOf(stop);
    const stops = [...project.stops];
    stops.splice(i + 1, 0, copy);
    const next = withAppearance(
      { ...project, stops },
      {
        ...appearance,
        layouts: { ...appearance.layouts, [copy.id]: structuredClone(layout) },
        overrides: appearance.overrides[stop.id]
          ? {
              ...appearance.overrides,
              [copy.id]: structuredClone(appearance.overrides[stop.id]!),
            }
          : appearance.overrides,
      },
    );
    commit(next);
    choose(copy.id);
  };
  const quickText = () => {
    if (!stop?.experience) return null;
    const d = stop.experience.data;
    if (selectedBlock === "title")
      return (
        <Field label="Nom de l’escale">
          <input
            value={stop.title}
            maxLength={160}
            onChange={(e) => updateStop({ title: e.target.value })}
          />
        </Field>
      );
    if (block?.kind === "text")
      return (
        <TextField
          label="Texte du bloc"
          value={block.text}
          maxLength={8000}
          onChange={(text) =>
            updateLayout({
              ...layout,
              blocks: layout.blocks.map((b) =>
                b.id === block.id ? { ...b, text } : b,
              ),
            })
          }
        />
      );
    if (
      selectedBlock === "everyday" &&
      d.editorial &&
      typeof d.editorial === "object" &&
      !Array.isArray(d.editorial)
    ) {
      const editorial = d.editorial;
      return (
        <TextField
          label="Et dans votre quotidien ?"
          value={
            typeof editorial.everyday === "string" ? editorial.everyday : ""
          }
          onChange={(everyday) =>
            updateData({ editorial: { ...editorial, everyday } })
          }
        />
      );
    }
    return typeof d.invitation === "string" ? (
      <>
        <Field label="Nom de l’escale">
          <input
            value={stop.title}
            maxLength={160}
            onChange={(e) => updateStop({ title: e.target.value })}
          />
        </Field>
        <TextField
          label="Invitation"
          value={d.invitation}
          onChange={(invitation) => updateData({ invitation })}
        />
      </>
    ) : null;
  };
  const totalBytes = assets.reduce((n, a) => n + a.size, 0);
  const saveTemplate = (kind: Template["kind"]) =>
    void run(async () => {
      const data =
        kind === "theme"
          ? appearance.theme
          : kind === "animation"
            ? animation
            : stop
              ? { stop, layout: layout.blocks }
              : null;
      if (!data) throw Error("Choisissez une escale.");
      await repository.saveTemplate({
        id: crypto.randomUUID(),
        name:
          kind === "theme"
            ? appearance.theme.name
            : kind === "animation"
              ? "Ondographe " + new Date().toLocaleTimeString("fr-FR")
              : stop!.title,
        kind,
        data,
      });
      await refresh();
      setMessage("Modèle enregistré dans votre bibliothèque.");
    });
  if (!ready)
    return (
      <main className="pro-loading">
        <Brand />
        <p role="status">Ouverture de votre atelier local…</p>
      </main>
    );
  return (
    <div className="pro-studio">
      <header className="pro-topbar">
        <Brand />
        <nav className="pro-main-nav" aria-label="Navigation du Studio">
          {(
            [
              ["creations", "Créations"],
              ["atelier", "Atelier"],
              ["publier", "Publier"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-current={screen === id ? "page" : undefined}
              onClick={() => {
                setScreen(id);
                if (id === "publier") void refresh();
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="pro-save">
          <span role="status">
            {saveState === "saved"
              ? "Enregistré sur cet appareil"
              : saveState === "saving"
                ? "Enregistrement…"
                : saveState === "invalid"
                  ? "Saisie à corriger"
                  : "Sauvegarde à vérifier"}
          </span>
          <small>
            {persistent
              ? "Stockage persistant accordé"
              : "Atelier personnel · local"}
          </small>
        </div>
        <button
          className="pro-backup"
          disabled={busy || !valid}
          onClick={() =>
            void run(async () => {
              await repository.save(project);
              downloadFile(
                await exportWorkspace(repository),
                "Sourciers-sauvegarde-" +
                  new Date().toISOString().slice(0, 10) +
                  ".zip",
              );
              setMessage(
                "Sauvegarde complète téléchargée. Conservez-la dans vos fichiers.",
              );
            })
          }
        >
          Sauvegarder un fichier
        </button>
      </header>
      {message && (
        <div className="pro-notice" role="status">
          <span>{message}</span>
          <button aria-label="Fermer le message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {saveState === "invalid" && (
        <p role="alert" className="pro-error">
          Certaines saisies sont invalides. La dernière version valide est
          conservée ; corrigez les champs pour reprendre la sauvegarde.
        </p>
      )}
      {screen === "creations" && (
        <main className="pro-library">
          <div className="pro-page-heading">
            <div>
              <span className="eyebrow">Votre espace de création</span>
              <h1>
                Des lieux, des liens,
                <br />
                <em>des expériences à composer.</em>
              </h1>
              <p>
                Retrouvez vos projets, vos médias et vos modèles. Tout reste sur
                cet appareil.
              </p>
            </div>
            <div className="pro-library-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => void run(() => open(createProject()))}
              >
                Nouveau projet
              </button>
              <label className="button file-action">
                Restaurer / importer
                <input
                  aria-label="Restaurer une sauvegarde ou importer JSON"
                  type="file"
                  accept=".zip,.json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) importFile(f);
                  }}
                />
              </label>
              <button
                onClick={() =>
                  void run(async () => {
                    if (!navigator.storage?.persist)
                      throw Error(
                        "Ce navigateur ne propose pas la protection du stockage. Conservez une sauvegarde exportée.",
                      );
                    const granted = await navigator.storage.persist();
                    setPersistent(granted);
                    setMessage(
                      granted
                        ? "Le navigateur a accordé un stockage persistant. Conservez aussi une copie exportée."
                        : "Le navigateur n’a pas accordé la persistance. La sauvegarde exportée reste votre copie de secours.",
                    );
                  })
                }
              >
                Protéger le stockage
              </button>
            </div>
          </div>
          <h2>Mes créations</h2>
          <div className="pro-project-cards">
            {projects.map((p) => (
              <article className="pro-project-card" key={p.id}>
                <span className="eyebrow">
                  {p.id === project.id ? "Projet ouvert" : "Brouillon local"}
                </span>
                <h3>{p.title}</h3>
                <p>
                  {p.stops.length} escales ·{" "}
                  {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void run(() => open(p))}
                >
                  Ouvrir {p.id === project.id ? "le projet" : "ce brouillon"}
                </button>
                <button
                  onClick={() =>
                    void run(() =>
                      open({
                        ...structuredClone(p),
                        id: crypto.randomUUID(),
                        title: (p.title + " · copie").slice(0, 160),
                      }),
                    )
                  }
                >
                  Dupliquer
                </button>
              </article>
            ))}
            {builtInCreations.map((c) => (
              <article className="pro-project-card prepared" key={c.slug}>
                <span className="eyebrow">Création préparée</span>
                <h3>{c.label}</h3>
                <p>{c.summary}</p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      open(
                        projects.find((p) => p.id === c.create().id) ??
                          c.create(),
                      ),
                    )
                  }
                >
                  Ouvrir dans le Studio
                </button>
                <button
                  className="quiet"
                  onClick={() =>
                    confirm(
                      "Recharger le parcours préparé ?",
                      "La version du code remplacera ce brouillon. Une copie de l’état actuel sera conservée dans l’historique.",
                      "Recharger le parcours",
                      async () => {
                        const existing = projects.find(
                          (p) => p.id === c.create().id,
                        );
                        if (existing)
                          await repository.snapshot(
                            existing,
                            "revision",
                            "Avant rechargement du code",
                          );
                        await open(c.create());
                      },
                    )
                  }
                >
                  Recharger la version du code
                </button>
              </article>
            ))}
          </div>
          <section className="pro-resource-section">
            <div className="pro-section-heading">
              <div>
                <h2>Bibliothèque de médias</h2>
                <p>
                  {assets.length} fichiers ·{" "}
                  {(totalBytes / 1024 / 1024).toFixed(1)} Mo sur cet appareil
                </p>
              </div>
              <label className="button file-action">
                Importer des médias
                <input
                  aria-label="Importer des médias dans la bibliothèque"
                  type="file"
                  multiple
                  accept="audio/*,image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="pro-media-grid">
              {assets.map((a) => (
                <article key={a.id}>
                  {a.mime.startsWith("image/") ? (
                    <img src={media[a.id]} alt={a.name} />
                  ) : (
                    <span className="media-glyph">≋</span>
                  )}
                  <strong>{a.name}</strong>
                  <small>{(a.size / 1024 / 1024).toFixed(1)} Mo</small>
                  {a.mime.startsWith("audio/") && (
                    <audio controls preload="none" src={media[a.id]} />
                  )}
                </article>
              ))}
              {!assets.length && (
                <p className="muted">
                  Importez vos sons et images. Ils seront inclus dans la
                  sauvegarde complète.
                </p>
              )}
            </div>
          </section>
          <section className="pro-resource-section">
            <h2>Mes modèles réutilisables</h2>
            <div className="pro-template-grid">
              {templates.map((t) => (
                <article key={t.id}>
                  <span className="eyebrow">
                    {t.kind === "theme"
                      ? "Charte"
                      : t.kind === "animation"
                        ? "Ondographe"
                        : "Escale"}
                  </span>
                  <h3>{t.name}</h3>
                  <button
                    onClick={() => {
                      if (t.kind === "theme")
                        updateAppearance({
                          ...appearance,
                          theme: ThemeSchema.parse(t.data),
                        });
                      else if (t.kind === "animation")
                        updateAnimation(AnimationSchema.parse(t.data));
                      else if (
                        t.data &&
                        typeof t.data === "object" &&
                        !Array.isArray(t.data)
                      ) {
                        const parsed = checkedProject({
                          ...createProject(),
                          stops: [t.data.stop],
                        });
                        const copy = duplicateStop(parsed.stops[0]!);
                        const templateLayout = {
                          ...defaultLayout(),
                          blocks: t.data.layout ?? defaultLayout().blocks,
                        };
                        commit(
                          withAppearance(
                            { ...project, stops: [...project.stops, copy] },
                            {
                              ...appearance,
                              layouts: {
                                ...appearance.layouts,
                                [copy.id]: LayoutSchema.parse(templateLayout),
                              },
                            },
                          ),
                        );
                        choose(copy.id);
                      }
                      setScreen("atelier");
                    }}
                  >
                    Utiliser ce modèle
                  </button>
                </article>
              ))}
              {!templates.length && (
                <p className="muted">
                  Enregistrez une charte, un Ondographe ou une escale depuis
                  l’atelier.
                </p>
              )}
            </div>
          </section>
        </main>
      )}
      {screen === "atelier" && (
        <>
          <div className="pro-documentbar">
            <input
              aria-label="Nom du parcours"
              maxLength={160}
              value={project.title}
              onChange={(e) =>
                commit({ ...project, title: e.target.value }, "project-title")
              }
            />
            <div className="pro-history-actions">
              <button onClick={undo} disabled={!canUndo} title="Ctrl/Cmd Z">
                Annuler
              </button>
              <button onClick={redo} disabled={!canRedo} title="Ctrl/Cmd Maj Z">
                Rétablir
              </button>
              <button
                disabled={!valid}
                onClick={() => {
                  setPreviewProject(undefined);
                  setScreen("preview");
                }}
              >
                Prévisualiser
              </button>
            </div>
          </div>
          <nav className="pro-mobile-tabs" aria-label="Panneaux de l’atelier">
            {(
              [
                ["structure", "Structure"],
                ["scene", "Aperçu"],
                ["reglages", "Réglages"],
              ] as const
            ).map(([id, label]) => (
              <button
                aria-pressed={mobilePane === id}
                key={id}
                onClick={() => setMobilePane(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <main className={"pro-workbench pane-" + mobilePane}>
            <aside className="pro-structure">
              <div className="pro-pane-heading">
                <h2>Structure</h2>
                <span>{project.stops.length} escales</span>
              </div>
              <button
                className={"pro-home-row " + (!stop ? "selected" : "")}
                onClick={() => choose(undefined)}
              >
                ◉ Accueil du parcours
              </button>
              <SortableList
                label="Escales"
                items={project.stops.map((s) => ({
                  id: s.id,
                  label: s.title || "Sans titre",
                }))}
                onMove={(id, target) =>
                  commit({
                    ...project,
                    stops: reorder(project.stops, id, target),
                  })
                }
              >
                {(id) => {
                  const s = project.stops.find((s) => s.id === id)!;
                  const i = project.stops.indexOf(s);
                  return (
                    <>
                      <button
                        className={
                          "pro-stop-row " +
                          (s.id === selected ? "selected" : "")
                        }
                        onClick={() => choose(s.id)}
                      >
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <span>
                          <strong>{s.title || "Sans titre"}</strong>
                          <small>
                            {s.experience
                              ? registry.resolve(s.experience).label
                              : "Choisir une expérience"}
                          </small>
                        </span>
                      </button>
                      <div className="pro-order-actions">
                        <button
                          aria-label={"Monter " + s.title}
                          disabled={i === 0}
                          onClick={() => commit(moveStop(project, s.id, -1))}
                        >
                          Monter
                        </button>
                        <button
                          aria-label={"Descendre " + s.title}
                          disabled={i === project.stops.length - 1}
                          onClick={() => commit(moveStop(project, s.id, 1))}
                        >
                          Descendre
                        </button>
                      </div>
                    </>
                  );
                }}
              </SortableList>
              <button
                className="pro-add"
                onClick={() => {
                  const next = addStop(
                    project,
                    "Escale " + (project.stops.length + 1),
                  );
                  commit(next);
                  choose(next.stops.at(-1)?.id);
                  setInspector("contenu");
                }}
              >
                ＋ Ajouter une escale
              </button>
              {stop && (
                <section className="pro-block-tree">
                  <h3>Blocs de cette escale</h3>
                  <SortableList
                    label="Blocs"
                    items={layout.blocks.map((b) => ({
                      id: b.id,
                      label: blockLabels[b.kind],
                    }))}
                    onMove={(id, target) =>
                      updateLayout({
                        ...layout,
                        blocks: reorder(layout.blocks, id, target),
                      })
                    }
                  >
                    {(id) => {
                      const b = layout.blocks.find((b) => b.id === id)!;
                      return (
                        <button
                          className={
                            "pro-block-row " +
                            (selectedBlock === id ? "selected" : "")
                          }
                          onClick={() => {
                            setSelectedBlock(id);
                            setInspector(
                              b.kind === "animation"
                                ? "animation"
                                : b.kind === "text" || b.kind === "image"
                                  ? "blocs"
                                  : "contenu",
                            );
                            setMobilePane("reglages");
                          }}
                        >
                          <span>{b.visible ? "◌" : "⊘"}</span>
                          {blockLabels[b.kind]}
                        </button>
                      );
                    }}
                  </SortableList>
                </section>
              )}
              <div className="pro-structure-footer">
                <button
                  disabled={!valid}
                  onClick={() =>
                    void run(async () => {
                      await repository.snapshot(
                        project,
                        "revision",
                        "Point de reprise manuel",
                      );
                      await refresh();
                      setMessage("Point de reprise créé.");
                    })
                  }
                >
                  Créer un point de reprise
                </button>
                <details
                  onToggle={(e) => {
                    if (e.currentTarget.open) void refresh();
                  }}
                >
                  <summary>Historique du projet</summary>
                  {snapshots
                    .filter((s) => s.projectId === project.id)
                    .slice(0, 12)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          confirm(
                            "Restaurer cette version ?",
                            s.name +
                              " · " +
                              new Date(s.createdAt).toLocaleString("fr-FR"),
                            "Restaurer la version",
                            () => {
                              commit(s.project);
                              choose(s.project.stops[0]?.id);
                            },
                          )
                        }
                      >
                        {s.kind === "published" ? "Version figée" : "Reprise"} ·{" "}
                        {new Date(s.createdAt).toLocaleTimeString("fr-FR")}
                      </button>
                    ))}
                </details>
              </div>
            </aside>
            <section className="pro-canvas">
              <div className="pro-canvas-toolbar">
                <span>
                  {stop
                    ? "Escale " +
                      (project.stops.indexOf(stop) + 1) +
                      " · " +
                      stop.title
                    : "Accueil du parcours"}
                </span>
                <div>
                  <button
                    aria-pressed={device === "mobile"}
                    onClick={() => setDevice("mobile")}
                  >
                    Mobile
                  </button>
                  <button
                    aria-pressed={device === "large"}
                    onClick={() => setDevice("large")}
                  >
                    Large
                  </button>
                </div>
              </div>
              <p className="pro-canvas-hint">
                Cliquez un élément de l’aperçu pour le modifier.
              </p>
              <div className={"pro-canvas-paper device-" + device}>
                <WorkshopProvider
                  appearance={appearance}
                  stopId={stop?.id}
                  media={media}
                >
                  {stop ? (
                    <StopPlayer
                      stop={stop}
                      registry={registry}
                      selectedBlock={selectedBlock}
                      onSelect={(id) => {
                        setSelectedBlock(id);
                        setInspector(
                          id === "animation"
                            ? "animation"
                            : layout.blocks.find((b) => b.id === id)?.kind ===
                                  "image" ||
                                layout.blocks.find((b) => b.id === id)?.kind ===
                                  "text"
                              ? "blocs"
                              : "contenu",
                        );
                        setMobilePane("reglages");
                      }}
                    />
                  ) : (
                    <div className="pro-home-preview">
                      <p className="eyebrow">Sourciers du Vivant •°</p>
                      <h1>{project.title}</h1>
                      <p className="prose">{project.description}</p>
                      {registry.available().map((m) => {
                        const Intro = m.ProjectIntro;
                        return Intro && project.extensions[m.id] ? (
                          <Intro key={m.id} data={project.extensions[m.id]!} />
                        ) : null;
                      })}
                      <div className="journey-grid">
                        {project.stops.map((s) => (
                          <button key={s.id} onClick={() => choose(s.id)}>
                            {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </WorkshopProvider>
              </div>
              <div className="pro-canvas-caption">
                Un même rendu dans l’atelier et le Player ·{" "}
                {device === "mobile" ? "390 px" : "720 px"}
              </div>
            </section>
            <aside className="pro-inspector">
              <div
                className="pro-inspector-tabs"
                role="tablist"
                aria-label="Outils d’édition"
              >
                {(
                  [
                    ["contenu", "Contenu"],
                    ["charte", "Charte"],
                    ["animation", "Ondographe"],
                    ["blocs", "Blocs"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    role="tab"
                    aria-selected={inspector === id}
                    key={id}
                    onClick={() => {
                      setInspector(id);
                      setSvgDirty(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="pro-inspector-body">
                {inspector === "contenu" && (
                  <>
                    <span className="eyebrow">
                      {stop ? "Votre escale" : "Votre parcours"}
                    </span>
                    <h2>
                      {stop
                        ? blockLabels[block?.kind ?? "invitation"]
                        : "Accueil & contenu"}
                    </h2>
                    {stop ? (
                      <>
                        <Field label="Type d’expérience">
                          <select
                            value={
                              stop.experience
                                ? stop.experience.moduleId +
                                  ":" +
                                  stop.experience.type
                                : ""
                            }
                            onChange={(e) => {
                              const [id, type] = e.target.value.split(":");
                              const module = registry
                                .available()
                                .find((m) => m.id === id);
                              const def = module?.experiences.find(
                                (d) => d.type === type,
                              );
                              if (!module || !def) return;
                              const apply = () =>
                                updateStop({
                                  experience: {
                                    moduleId: module.id,
                                    moduleVersion: module.version,
                                    type: def.type,
                                    data: def.defaults(),
                                  },
                                });
                              if (stop.experience)
                                confirm(
                                  "Changer de forme d’écoute ?",
                                  "Le contenu de l’expérience sera remplacé. Vous pourrez annuler ce changement.",
                                  "Changer d’expérience",
                                  apply,
                                );
                              else apply();
                            }}
                          >
                            <option value="">Choisir une expérience</option>
                            {registry.available().flatMap((m) =>
                              m.experiences.map((d) => (
                                <option
                                  value={m.id + ":" + d.type}
                                  key={m.id + d.type}
                                >
                                  {d.label}
                                </option>
                              )),
                            )}
                          </select>
                        </Field>
                        {quickText()}
                        {definition && stop.experience && (
                          <>
                            <button
                              className="pro-disclosure"
                              onClick={() => setFullSettings(!fullSettings)}
                            >
                              {fullSettings
                                ? "Réduire les réglages"
                                : "Réglages complets du contenu"}
                            </button>
                            {fullSettings && (
                              <definition.Editor
                                key={stop.id + stop.experience.type}
                                data={stop.experience.data}
                                onChange={(data) =>
                                  updateStop({
                                    experience: stop.experience
                                      ? { ...stop.experience, data }
                                      : null,
                                  })
                                }
                              />
                            )}
                          </>
                        )}
                        <section className="pro-insert-media">
                          <h3>Un son ou une image</h3>
                          <label className="button file-action">
                            Importer et utiliser
                            <input
                              aria-label="Importer un média pour cette escale"
                              type="file"
                              accept="audio/*,image/png,image/jpeg,image/webp,image/svg+xml"
                              onChange={(e) => {
                                addFiles(e.target.files, true);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <Field label="Choisir un son local">
                            <select
                              value=""
                              disabled={
                                !stop.experience ||
                                stop.experience.type === "in-situ"
                              }
                              onChange={(e) => {
                                if (!e.target.value || !stop.experience) return;
                                if (stop.experience.type === "surprise") {
                                  const list = Array.isArray(
                                    stop.experience.data.collection,
                                  )
                                    ? stop.experience.data.collection
                                    : [];
                                  updateData({
                                    collection: [
                                      ...list,
                                      {
                                        id: crypto.randomUUID(),
                                        title:
                                          assets.find(
                                            (a) => a.id === e.target.value,
                                          )?.name ?? "Création",
                                        url: "asset:" + e.target.value,
                                        description: "",
                                        credits: "",
                                      },
                                    ],
                                  });
                                } else
                                  updateData({
                                    url: "asset:" + e.target.value,
                                  });
                              }}
                            >
                              <option value="">Dans ma bibliothèque…</option>
                              {assets
                                .filter((a) => a.mime.startsWith("audio/"))
                                .map((a) => (
                                  <option value={a.id} key={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                            </select>
                          </Field>
                        </section>
                        <div className="pro-inspector-actions">
                          <button onClick={duplicate}>
                            Dupliquer l’escale
                          </button>
                          <button onClick={() => saveTemplate("stop")}>
                            Enregistrer comme modèle
                          </button>
                          <button
                            className="danger"
                            onClick={() =>
                              confirm(
                                "Supprimer cette escale ?",
                                stop.title +
                                  " sera retirée du parcours. Annuler permettra de la retrouver.",
                                "Confirmer la suppression",
                                () => {
                                  commit(removeStop(project, stop.id));
                                  choose(
                                    project.stops.find((s) => s.id !== stop.id)
                                      ?.id,
                                  );
                                },
                              )
                            }
                          >
                            Supprimer l’escale
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <TextField
                          label="Présentation du parcours"
                          value={project.description}
                          onChange={(description) =>
                            commit({ ...project, description }, "description")
                          }
                        />
                        {registry.available().map((m) => {
                          const Editor = m.ProjectEditor;
                          return Editor && project.extensions[m.id] ? (
                            <Editor
                              key={m.id}
                              data={project.extensions[m.id]!}
                              onChange={(data) =>
                                commit(
                                  {
                                    ...project,
                                    extensions: {
                                      ...project.extensions,
                                      [m.id]: data,
                                    },
                                  },
                                  "project-settings",
                                )
                              }
                            />
                          ) : null;
                        })}
                      </>
                    )}
                  </>
                )}
                {inspector === "charte" && (
                  <ThemeTools
                    {...{
                      appearance,
                      updateAppearance,
                      templates,
                      saveTemplate,
                    }}
                  />
                )}
                {inspector === "animation" && (
                  <AnimationTools
                    {...{
                      appearance,
                      updateAppearance,
                      animation,
                      updateAnimation,
                      scope,
                      setScope,
                      stop,
                      svgDraft,
                      setSvgDraft,
                      svgDirty,
                      setSvgDirty,
                      svgError,
                      setSvgError,
                      setMessage,
                      saveTemplate,
                    }}
                  />
                )}
                {inspector === "blocs" && (
                  <BlockTools
                    {...{
                      stop,
                      layout,
                      updateLayout,
                      block,
                      assets,
                      setSelectedBlock,
                    }}
                  />
                )}
              </div>
            </aside>
          </main>
        </>
      )}
      {screen === "preview" && (
        <main className="pro-full-preview">
          <div className="pro-preview-header">
            <button
              onClick={() => {
                setScreen("atelier");
                setPreviewProject(undefined);
              }}
            >
              Retour à l’atelier
            </button>
            <span>
              {previewProject
                ? "Version locale figée"
                : "Aperçu du brouillon courant"}
            </span>
          </div>
          <ProjectPlayer
            key={(previewProject ?? project).id}
            project={previewProject ?? project}
            registry={registry}
            media={media}
          />
        </main>
      )}
      {screen === "publier" && (
        <main className="pro-publish">
          <span className="eyebrow">De l’atelier au parcours</span>
          <h1>
            Préparer une version
            <br />
            <em>à partager.</em>
          </h1>
          <p>
            Figez votre création, puis exportez un Player autonome avec ses
            médias locaux.
          </p>
          <section className="pro-publish-card">
            <h2>{project.title}</h2>
            <p>
              {project.stops.length} escales · {assetIds(project).size} média(s)
              local(aux) utilisé(s)
            </p>
            {!valid && (
              <p className="pro-error">
                Corrigez les saisies avant de créer une version.
              </p>
            )}
            {project.stops.filter((s) => !s.experience).length > 0 && (
              <p className="notice">
                Certaines escales n’ont pas encore d’expérience.
              </p>
            )}
            {project.stops.some(
              (s) =>
                s.experience &&
                ["audio", "seasonal"].includes(s.experience.type) &&
                !s.experience.data.url,
            ) && (
              <p className="notice">
                Des créations sonores sont encore en préparation. Vérifiez le
                contenu avant diffusion.
              </p>
            )}
            <button
              className="primary"
              disabled={!valid || busy}
              onClick={() =>
                void run(async () => {
                  await repository.save(project);
                  await repository.snapshot(
                    project,
                    "published",
                    "Version du " + new Date().toLocaleString("fr-FR"),
                  );
                  await refresh();
                  setMessage(
                    "Version locale figée. Le brouillon peut continuer à évoluer.",
                  );
                })
              }
            >
              Créer une version locale
            </button>
            <p className="pro-helper">
              Une version locale est une copie indépendante du brouillon. Cette
              action ne met rien en ligne.
            </p>
          </section>
          <Field label="Adresse de publication pour les QR codes (facultatif)">
            <input
              type="url"
              placeholder="https://votre-site.fr/parcours/"
              value={publicationAddress}
              onChange={(e) => setPublicationAddress(e.target.value)}
            />
          </Field>
          <div className="pro-versions">
            {snapshots
              .filter(
                (s) => s.projectId === project.id && s.kind === "published",
              )
              .map((s) => (
                <article key={s.id}>
                  <div>
                    <h3>{s.name}</h3>
                    <p>
                      {s.project.stops.length} escales ·{" "}
                      {new Date(s.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreviewProject(s.project);
                      setScreen("preview");
                    }}
                  >
                    Voir cette version
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const archive = await buildPlayerArchive(
                          s.project,
                          assets,
                          publicationAddress,
                        );
                        downloadFile(
                          archive,
                          "Sourciers-Player-" + s.project.id + ".zip",
                        );
                        setMessage(
                          "Player exporté avec les médias locaux. Décompressez et transférez le dossier sur un hébergement HTTPS.",
                        );
                      })
                    }
                  >
                    Exporter cette version (.zip)
                  </button>
                </article>
              ))}
          </div>
          <div className="pro-publish-card">
            <h2>Conserver aussi vos sources</h2>
            <p>
              La sauvegarde complète conserve tous vos projets, médias, modèles
              et versions sur un fichier de votre téléphone.
            </p>
            <button
              disabled={busy || !valid}
              onClick={() =>
                void run(async () => {
                  await repository.save(project);
                  downloadFile(
                    await exportWorkspace(repository),
                    "Sourciers-sauvegarde.zip",
                  );
                })
              }
            >
              Exporter une sauvegarde complète
            </button>
            <button
              disabled={!valid}
              onClick={() =>
                downloadFile(
                  new Blob([serializeProject(project)], {
                    type: "application/json",
                  }),
                  "parcours-" + project.id + ".json",
                )
              }
            >
              Exporter JSON seul
            </button>
          </div>
        </main>
      )}
      <footer className="pro-footer">
        <span>
          Sourciers Studio •° <strong>Atelier local</strong>
        </span>
        <span>
          {busy
            ? "Opération en cours…"
            : saveState === "saved"
              ? "Votre travail reste sur cet appareil."
              : ""}
        </span>
      </footer>
      {dialog && (
        <Dialog title={dialog.title} onClose={() => setDialog(undefined)}>
          <p>{dialog.body}</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              const task = dialog.confirm;
              setDialog(undefined);
              void run(async () => {
                await task();
              });
            }}
          >
            {dialog.label}
          </button>
        </Dialog>
      )}
    </div>
  );
}
