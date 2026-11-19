import { useEffect, useState } from "react";
import type { Project, Stop } from "@sourciers/core";
import type { ModuleRegistry } from "@sourciers/module-sdk";
import {
  WorkshopProvider,
  useWorkshop,
  appearanceOf,
  layoutOf,
  type Block,
} from "@sourciers/studio-tools";
import type { ReactNode } from "react";
import { Empty } from "@sourciers/design-system";
export function StopPlayer({
  stop,
  registry,
  onSelect,
  selectedBlock,
}: {
  stop: Stop;
  registry: ModuleRegistry;
  onSelect?: (id: string) => void;
  selectedBlock?: string;
}) {
  const context = useWorkshop();
  const layout = layoutOf(context.appearance, stop.id);
  if (!stop.experience)
    return <Empty>Choisissez une expérience pour cette escale.</Empty>;
  try {
    const def = registry.resolve(stop.experience);
    def.schema.parse(stop.experience.data);
    const View = def.Player;
    const Blocks = def.PlayerBlocks;
    const renderBlocks = (
      content: readonly { id: string; label: string; content: ReactNode }[],
    ) => {
      const known = new Map(
        [
          ...content,
          { id: "title", label: "Titre", content: <h2>{stop.title}</h2> },
        ].map((b) => [b.id, b]),
      );
      return (
        <div
          className={
            "visual-blocks align-" + layout.align + " width-" + layout.width
          }
          style={{ gap: layout.gap }}
        >
          {layout.blocks
            .filter((b) => b.visible)
            .map((block: Block) => {
              const view = known.get(block.kind);
              const extra =
                block.kind === "text" ? (
                  <p className="prose">{block.text}</p>
                ) : block.kind === "image" && context.media[block.assetId] ? (
                  <img
                    className="journey-image"
                    src={context.media[block.assetId]}
                    alt={block.text}
                  />
                ) : null;
              if (!view && !extra) return null;
              return (
                <section
                  key={block.id}
                  data-block-id={block.id}
                  className={
                    "visual-block " +
                    (selectedBlock === block.id ? "is-selected" : "") +
                    (onSelect ? " is-editable" : "")
                  }
                  tabIndex={onSelect ? 0 : undefined}
                  aria-label={
                    onSelect
                      ? "Sélectionner " + (view?.label ?? block.kind)
                      : undefined
                  }
                  onClick={() => onSelect?.(block.id)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      event.target === event.currentTarget
                    )
                      onSelect?.(block.id);
                  }}
                >
                  {view?.content ?? extra}
                </section>
              );
            })}
        </div>
      );
    };
    return (
      <WorkshopProvider
        appearance={context.appearance}
        stopId={stop.id}
        media={context.media}
      >
        <div className="experience-player" key={stop.id + stop.experience.type}>
          {Blocks ? (
            <Blocks data={stop.experience.data} renderBlocks={renderBlocks} />
          ) : (
            <>
              <h2>{stop.title}</h2>
              <View data={stop.experience.data} />
            </>
          )}
        </div>
      </WorkshopProvider>
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
  media = {},
}: {
  project: Project;
  registry: ModuleRegistry;
  media?: Record<string, string>;
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
    <WorkshopProvider appearance={appearanceOf(project)} media={media}>
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
    </WorkshopProvider>
  );
}
