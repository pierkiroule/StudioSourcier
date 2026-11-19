import { useEffect, useState } from "react";
import {
  addStop,
  createProject,
  moveStop,
  parseProject,
  removeStop,
  serializeProject,
  type Project,
  type Stop,
} from "@sourciers/core";
import { ModuleRegistry } from "@sourciers/module-sdk";
import { soundscapesModule } from "@sourciers/soundscapes";
import { Brand, Empty, Field } from "@sourciers/design-system";
import { StopPlayer } from "../../player/src/Player";
export const registry = new ModuleRegistry().register(soundscapesModule);
const STORAGE = "sourciers:current:v1";
function load(): { project: Project; message: string } {
  try {
    const json = localStorage.getItem(STORAGE);
    return {
      project: json
        ? registry.validateProject(parseProject(JSON.parse(json)))
        : createProject(),
      message: json ? "Brouillon local restauré." : "",
    };
  } catch {
    return {
      project: createProject(),
      message: "Le brouillon stocké est invalide. Il n’a pas été remplacé.",
    };
  }
}
export function App() {
  const [initial] = useState(load);
  const [project, setProject] = useState(initial.project);
  const [selected, setSelected] = useState<string>();
  const [message, setMessage] = useState(initial.message);
  const [started, setStarted] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [newProject, setNewProject] = useState(false);
  const stop = project.stops.find((s) => s.id === selected) ?? project.stops[0];
  const update = (p: Project) => {
    setProject({ ...p, updatedAt: new Date().toISOString() });
    setStarted(true);
  };
  const updateStop = (patch: Partial<Stop>) => {
    if (stop)
      update({
        ...project,
        stops: project.stops.map((s) =>
          s.id === stop.id ? { ...s, ...patch } : s,
        ),
      });
  };
  useEffect(() => {
    if (!started) return;
    try {
      registry.validateProject(parseProject(project));
      localStorage.setItem(STORAGE, serializeProject(project));
      setMessage("Brouillon enregistré sur cet appareil.");
    } catch {
      setMessage(
        "Modifications non enregistrées : vérifiez les champs signalés.",
      );
    }
  }, [project, started]);
  let validation = "";
  try {
    registry.validateProject(parseProject(project));
  } catch {
    validation =
      "Vérifiez les titres et les adresses audio HTTPS avant d’enregistrer.";
  }
  const definition = stop?.experience
    ? registry.resolve(stop.experience)
    : null;
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <div className="header-actions">
          <span className="local-label">Local · V0.1</span>
          <button onClick={() => setNewProject(true)}>Nouveau projet</button>
          <label
            className="button"
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.querySelector("input")?.click();
              }
            }}
          >
            Importer JSON
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void file
                    .text()
                    .then((text) => {
                      const p = registry.validateProject(
                        parseProject(JSON.parse(text)),
                      );
                      update(p);
                      setSelected(p.stops[0]?.id);
                      setMessage("Projet importé.");
                    })
                    .catch(() =>
                      setMessage(
                        "Import refusé : fichier invalide ou version incompatible.",
                      ),
                    );
                e.target.value = "";
              }}
            />
          </label>
          <button
            className="primary"
            disabled={!!validation}
            onClick={() => {
              try {
                const blob = new Blob(
                  [serializeProject(registry.validateProject(project))],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "parcours-" + project.id + ".json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setMessage("Projet exporté en JSON.");
              } catch {
                setMessage("Export impossible : projet invalide.");
              }
            }}
          >
            Exporter JSON
          </button>
        </div>
      </header>
      <section className="project-heading">
        <div>
          <span className="eyebrow">L’atelier des parcours sensibles</span>
          <h1>
            Un lieu. Des rencontres.
            <br />
            <em>Votre parcours prend vie.</em>
          </h1>
          <p>Composez des escales et ouvrez de nouvelles façons d’écouter.</p>
        </div>
        <div className="project-meta">
          <span className="pill">
            ◌ {project.stops.length} escale{project.stops.length > 1 ? "s" : ""}
          </span>
          <span className="pill">Module · Parcours sonores</span>
          <p role="status">
            {message || "Prêt à créer. Tout commence par une escale."}
          </p>
        </div>
      </section>
      <section className="project-fields">
        <Field label="Nom du parcours">
          <input
            value={project.title}
            maxLength={160}
            onChange={(e) => update({ ...project, title: e.target.value })}
          />
        </Field>
        <Field label="Quelques mots sur ce parcours">
          <input
            value={project.description}
            maxLength={4000}
            placeholder="Une intention, un lieu, une invitation…"
            onChange={(e) =>
              update({ ...project, description: e.target.value })
            }
          />
        </Field>
      </section>
      {validation && (
        <p className="validation" role="alert">
          {validation}
        </p>
      )}
      <main className="workspace">
        <aside className="stop-list">
          <div className="panel-heading">
            <h2>Les escales</h2>
            <span>{project.stops.length}</span>
          </div>
          <p className="muted">Chaque escale, une nouvelle rencontre.</p>
          <ol>
            {project.stops.map((s, i) => (
              <li key={s.id} className={stop?.id === s.id ? "active" : ""}>
                <button
                  className="stop-select"
                  aria-current={stop?.id === s.id ? "step" : undefined}
                  onClick={() => {
                    setSelected(s.id);
                    setPendingDelete(false);
                  }}
                >
                  <span className="stop-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{s.title || "Sans titre"}</strong>
                    <small>
                      {s.experience
                        ? registry.resolve(s.experience).label
                        : "Expérience à choisir"}
                    </small>
                  </span>
                </button>
                <div className="reorder">
                  <button
                    aria-label={"Monter " + s.title}
                    disabled={i === 0}
                    onClick={() => update(moveStop(project, s.id, -1))}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={"Descendre " + s.title}
                    disabled={i === project.stops.length - 1}
                    onClick={() => update(moveStop(project, s.id, 1))}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            className="add-stop"
            onClick={() => {
              const p = addStop(
                project,
                "Escale " + (project.stops.length + 1),
              );
              update(p);
              setSelected(p.stops.at(-1)?.id);
            }}
          >
            ＋ Ajouter une escale
          </button>
          <div className="aside-note">
            Des parcours ouverts,
            <br />
            au rythme du vivant. <span>•°</span>
          </div>
        </aside>
        <section className="editor">
          <div className="panel-heading">
            <h2>L’expérience</h2>
            <button
              className="mobile-preview"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Fermer l’aperçu" : "Voir l’aperçu"}
            </button>
          </div>
          {stop ? (
            <>
              <Field label="Nom de l’escale">
                <input
                  value={stop.title}
                  maxLength={160}
                  onChange={(e) => updateStop({ title: e.target.value })}
                />
              </Field>
              <h3>Choisir une forme d’écoute</h3>
              {stop.experience && (
                <p className="muted">
                  Changer de forme remplace le contenu de cette expérience.
                </p>
              )}
              <div className="experience-types">
                {registry.list().flatMap((m) =>
                  m.experiences.map((d) => (
                    <button
                      key={m.id + d.type}
                      aria-pressed={stop.experience?.type === d.type}
                      onClick={() => {
                        if (stop.experience?.type === d.type) return;
                        updateStop({
                          experience: {
                            moduleId: m.id,
                            moduleVersion: m.version,
                            type: d.type,
                            data: d.defaults(),
                          },
                        });
                      }}
                    >
                      <span aria-hidden="true">{d.glyph}</span>
                      <strong>{d.label}</strong>
                      <small>{d.description}</small>
                    </button>
                  )),
                )}
              </div>
              {definition && stop.experience && (
                <div className="content-editor">
                  <definition.Editor
                    data={stop.experience.data}
                    onChange={(data) =>
                      updateStop({
                        experience: stop.experience
                          ? { ...stop.experience, data }
                          : null,
                      })
                    }
                  />
                </div>
              )}
              <div className="danger-zone">
                {pendingDelete ? (
                  <>
                    <span>Supprimer cette escale ?</span>
                    <button
                      className="danger"
                      onClick={() => {
                        update(removeStop(project, stop.id));
                        setPendingDelete(false);
                      }}
                    >
                      Confirmer la suppression
                    </button>
                    <button onClick={() => setPendingDelete(false)}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    className="quiet danger"
                    onClick={() => setPendingDelete(true)}
                  >
                    Supprimer l’escale
                  </button>
                )}
              </div>
            </>
          ) : (
            <Empty>
              <span className="empty-symbol">◌</span>
              <h3>Une première escale ?</h3>
              <p>
                Ajoutez un point de rencontre avec le vivant.
                <br />
                Vous choisirez ensuite sa forme d’écoute.
              </p>
            </Empty>
          )}
        </section>
        <aside className={"preview " + (preview ? "is-open" : "")}>
          <div className="panel-heading">
            <h2>Aperçu du Player</h2>
            <span className="preview-badge">En direct</span>
          </div>
          <div className="phone">
            <div className="phone-top">
              <span>Les Sourciers du Vivant •°</span>
              <div className="phone-line" />
            </div>
            {stop ? (
              <StopPlayer stop={stop} registry={registry} />
            ) : (
              <Empty>Votre escale apparaîtra ici.</Empty>
            )}
            <div className="phone-bottom">Oreillez-vous ! •°</div>
          </div>
          <p className="preview-caption">
            Le même moteur que le parcours publié.
          </p>
        </aside>
      </main>
      <footer>
        Sourciers Studio •°{" "}
        <span>Un atelier pour faire résonner les lieux.</span>
      </footer>
      {newProject && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-title"
          >
            <h2 id="new-title">Créer un nouveau parcours ?</h2>
            <p>
              Exportez votre projet actuel si vous souhaitez le conserver. Le
              nouveau parcours remplacera le brouillon de cet appareil.
            </p>
            <button onClick={() => setNewProject(false)}>Annuler</button>
            <button
              className="primary"
              onClick={() => {
                update(createProject());
                setSelected(undefined);
                setNewProject(false);
              }}
            >
              Créer le projet
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
