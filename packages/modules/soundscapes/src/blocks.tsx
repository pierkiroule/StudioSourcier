import { useState, type ReactNode } from "react";
import type { Content } from "@sourciers/module-sdk";
import { seasonAt, seasons } from "./legacy";
import {
  InSituV11Schema,
  AudioV11Schema,
  SeasonalV11Schema,
  SurpriseSchema,
  Recording,
  Everyday,
  Ondograph,
  nextSurpriseIndex,
} from "./enhanced";
export function SoundscapeBlocks({
  data,
  type,
  renderBlocks,
}: {
  data: Content;
  type: string;
  renderBlocks: (
    blocks: readonly { id: string; label: string; content: ReactNode }[],
  ) => ReactNode;
}) {
  const situ = type === "in-situ" ? InSituV11Schema.parse(data) : null;
  const audio = type === "audio" ? AudioV11Schema.parse(data) : null;
  const seasonal = type === "seasonal" ? SeasonalV11Schema.parse(data) : null;
  const surprise = type === "surprise" ? SurpriseSchema.parse(data) : null;
  const d = situ ?? audio ?? seasonal ?? surprise;
  if (!d) throw Error("Expérience inconnue");
  const [season, setSeason] = useState(seasonAt());
  const [playing, setPlaying] = useState(false);
  const [chosen, setChosen] = useState<string>();
  const tracks = surprise?.collection.filter((t) => t.url) ?? [];
  const track = tracks.find((t) => t.id === chosen);
  const labels = {
    spring: "Printemps",
    summer: "Été",
    autumn: "Automne",
    winter: "Hiver",
  };
  const url = seasonal
    ? seasonal.seasons[season] || seasonal.url
    : (audio?.url ?? "");
  const blocks: { id: string; label: string; content: ReactNode }[] = [
    {
      id: "animation",
      label: "Ondographe",
      content: <Ondograph wave={d.editorial.wave} playing={playing} />,
    },
    {
      id: "invitation",
      label: "Invitation",
      content: (
        <>
          <p className="invitation">{d.invitation}</p>
          {situ?.duration !== null && situ?.duration !== undefined && (
            <span className="pill">
              Environ {situ.duration} secondes · À votre rythme
            </span>
          )}
        </>
      ),
    },
  ];
  if (seasonal)
    blocks.push({
      id: "seasons",
      label: "Saisons",
      content: (
        <>
          <div className="seasons">
            {seasons.map((s) => (
              <button
                key={s}
                aria-pressed={s === season}
                onClick={() => {
                  if ((seasonal.seasons[s] || seasonal.url) !== url)
                    setPlaying(false);
                  setSeason(s);
                }}
              >
                {labels[s]}
              </button>
            ))}
          </div>
          <p className="prose">{seasonal.notes[season]}</p>
        </>
      ),
    });
  if (audio || seasonal)
    blocks.push({
      id: "audio",
      label: "Audio",
      content: (
        <Recording
          url={url}
          transcript={(audio ?? seasonal)!.transcript}
          credits={(audio ?? seasonal)!.credits}
          onPlaying={setPlaying}
        />
      ),
    });
  if (surprise)
    blocks.push({
      id: "audio",
      label: "Découverte sonore",
      content: tracks.length ? (
        <>
          <button
            className="primary"
            onClick={() => {
              setChosen(
                tracks[
                  nextSurpriseIndex(
                    tracks.length,
                    tracks.findIndex((t) => t.id === chosen),
                  )
                ]?.id,
              );
              setPlaying(false);
            }}
          >
            {track ? "Une autre écoute" : "Découvrir une écoute"}
          </button>
          {track && (
            <section key={track.id}>
              <h3>{track.title}</h3>
              <Recording
                url={track.url}
                transcript={track.description}
                credits={track.credits}
                onPlaying={setPlaying}
              />
            </section>
          )}
        </>
      ) : (
        <p className="notice">La collection sonore est en préparation.</p>
      ),
    });
  if (d.editorial.everyday)
    blocks.push({
      id: "everyday",
      label: "Ouverture vers le quotidien",
      content: <Everyday text={d.editorial.everyday} />,
    });
  return <>{renderBlocks(blocks)}</>;
}
