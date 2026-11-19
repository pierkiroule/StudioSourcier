import { useState } from "react";
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
  const [selected, setSelected] = useState(project.stops[0]?.id);
  const stop = project.stops.find((s) => s.id === selected) ?? project.stops[0];
  return (
    <main className="standalone">
      <p className="eyebrow">Sourciers du Vivant •°</p>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <nav className="player-nav" aria-label="Escales">
        {project.stops.map((s) => (
          <button
            key={s.id}
            aria-pressed={stop?.id === s.id}
            onClick={() => setSelected(s.id)}
          >
            {s.title}
          </button>
        ))}
      </nav>
      {stop ? (
        <StopPlayer stop={stop} registry={registry} />
      ) : (
        <Empty>Ce parcours ne contient pas encore d’escale.</Empty>
      )}
    </main>
  );
}
