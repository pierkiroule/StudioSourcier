import { useEffect, useState } from "react";
import type { Project, Stop } from "@sourciers/core";
import type { ModuleRegistry } from "@sourciers/module-sdk";
import { Empty } from "@sourciers/design-system";
export function StopPlayer({
  stop,
  registry,
}: {
  stop: Stop;
  registry: ModuleRegistry;
}) {
  if (!stop.experience)
    return <Empty>Choisissez une expérience pour cette escale.</Empty>;
  try {
    const def = registry.resolve(stop.experience);
    def.schema.parse(stop.experience.data);
    const View = def.Player;
    return (
      <div className="experience-player" key={stop.id + stop.experience.type}>
        <h2>{stop.title}</h2>
        <View data={stop.experience.data} />
      </div>
    );
  } catch {
    return (
      <p role="alert" className="notice">
        Cette expérience est invalide ou son module est indisponible.
      </p>
    );
  }
}
export function ProjectPlayer({
  project,
  registry,
}: {
  project: Project;
  registry: ModuleRegistry;
}) {
  const readHash = () => {
    const hash = new URLSearchParams(location.hash.slice(1));
    const id = hash.get("escale");
    return project.stops.some((s) => s.id === id) ? id : undefined;
  };
  const [selected, setSelected] = useState(readHash);
  useEffect(() => {
    const onHash = () => setSelected(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [project.id]);
  useEffect(() => {
    document
      .getElementById("journey-top")
      ?.scrollIntoView?.({ block: "start" });
  }, [selected]);
  const stop = project.stops.find((s) => s.id === selected);
  const modules = registry
    .available()
    .filter((m) => project.extensions[m.id] !== undefined);
  return (
    <main className="standalone" id="journey-top">
      <p className="eyebrow">Sourciers du Vivant •°</p>
      <h1>{project.title}</h1>
      {!stop && (
        <>
          <p className="prose">{project.description}</p>
          {modules.map((m) => {
            const Intro = m.ProjectIntro;
            return Intro ? (
              <Intro key={m.id} data={project.extensions[m.id]!} />
            ) : null;
          })}
          <nav className="journey-grid" id="escales" aria-label="Escales">
            {project.stops.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s.id);
                  location.hash = "escale=" + s.id;
                }}
              >
                <span>Borne {i + 1}</span>
                <strong>{s.title}</strong>
                <small>
                  {s.experience
                    ? registry.resolve(s.experience).label
                    : "À préparer"}
                </small>
              </button>
            ))}
          </nav>
          {!project.stops.length && (
            <Empty>Ce parcours ne contient pas encore d’escale.</Empty>
          )}
        </>
      )}
      {stop && (
        <section id="experience">
          <p className="eyebrow">Borne {project.stops.indexOf(stop) + 1}</p>
          <StopPlayer stop={stop} registry={registry} />
          <a
            className="journey-back"
            href="#escales"
            onClick={() => setSelected(undefined)}
          >
            Retour aux {project.stops.length} bornes
          </a>
          <a
            className="journey-back"
            style={{ marginLeft: 20 }}
            href={"#escale=" + stop.id}
          >
            Lien direct de cette escale
          </a>
        </section>
      )}
      {modules.map((m) => {
        const Footer = m.ProjectFooter;
        return Footer ? (
          <Footer key={m.id} data={project.extensions[m.id]!} />
        ) : null;
      })}
    </main>
  );
}
