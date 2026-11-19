import { useState } from "react";
import { z } from "zod";
import type {
  Content,
  ExperienceDefinition,
  StudioModule,
} from "@sourciers/module-sdk";
import { Field } from "@sourciers/design-system";
import { AudioUrlSchema } from "@sourciers/media";
import {
  InSituSchema,
  AudioSchema,
  SeasonalSchema,
  seasons,
  seasonAt,
} from "./legacy";
import {
  ProjectContentSchema,
  ProjectContentEditor,
  ProjectIntro,
  ProjectFooter,
} from "./project-content";
const labels = {
  spring: "Printemps",
  summer: "Été",
  autumn: "Automne",
  winter: "Hiver",
};
export const waves = [
  "horizon",
  "silence",
  "voices",
  "wind",
  "rhythm",
  "landscape",
  "birds",
  "branches",
  "particles",
  "elements",
  "time",
  "morph",
  "surprise",
] as const;
const waveLabels: Record<(typeof waves)[number], string> = {
  horizon: "Horizon et profondeurs",
  silence: "Présences discrètes",
  voices: "Voix proches",
  wind: "Souffle et traversées",
  rhythm: "Rythmes et intervalles",
  landscape: "Paysage d’ensemble",
  birds: "Trajectoires aériennes",
  branches: "Ramifications",
  particles: "Monde minuscule",
  elements: "Rencontre des éléments",
  time: "Arcs du temps",
  morph: "Métamorphoses",
  surprise: "L’inattendu",
};
export const EditorialSchema = z
  .object({
    panelInvitation: z.string().max(4000),
    qrCaption: z.string().max(1000),
    everyday: z.string().max(4000),
    learning: z.string().max(4000),
    competency: z.string().max(4000),
    transpositions: z.string().max(4000),
    vigilance: z.string().max(4000),
    wave: z.enum(waves),
    location: z.string().max(1000),
    owner: z.string().max(300),
    status: z.enum(["draft", "review", "approved"]),
    illustrationCredit: z.string().max(2000),
  })
  .strict();
export const editorialDefaults = () => ({
  panelInvitation: "",
  qrCaption: "",
  everyday: "",
  learning: "",
  competency: "",
  transpositions: "",
  vigilance: "",
  wave: "horizon" as const,
  location: "",
  owner: "",
  status: "draft" as const,
  illustrationCredit: "",
});
const editorial = { editorial: EditorialSchema };
export const InSituV11Schema = InSituSchema.extend({
  duration: InSituSchema.shape.duration.nullable(),
  ...editorial,
});
export const AudioV11Schema = AudioSchema.extend({
  ...editorial,
  credits: z.string().max(4000),
});
export const SeasonalV11Schema = SeasonalSchema.extend({
  ...editorial,
  url: AudioUrlSchema,
  transcript: z.string().max(20000),
  credits: z.string().max(4000),
});
export const TrackSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    url: AudioUrlSchema,
    description: z.string().max(20000),
    credits: z.string().max(4000),
  })
  .strict();
export const SurpriseSchema = z
  .object({
    invitation: z.string().max(4000),
    ...editorial,
    collection: z.array(TrackSchema).max(100),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      new Set(data.collection.map((t) => t.id)).size !== data.collection.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Identifiants de créations dupliqués",
      });
  });
const stringUrl = z.string();
function Text({
  label,
  value,
  onChange,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        rows={3}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
function Url({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="url"
        value={value}
        placeholder="https://…"
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
function EditorialEditor({
  data,
  onChange,
}: {
  data: z.infer<typeof EditorialSchema>;
  onChange: (data: z.infer<typeof EditorialSchema>) => void;
}) {
  const text = (
    key: Exclude<keyof typeof data, "wave" | "status">,
    label: string,
  ) => (
    <Text
      label={label}
      value={data[key]}
      maxLength={
        {
          panelInvitation: 4000,
          qrCaption: 1000,
          everyday: 4000,
          learning: 4000,
          competency: 4000,
          transpositions: 4000,
          vigilance: 4000,
          location: 1000,
          owner: 300,
          illustrationCredit: 2000,
        }[key]
      }
      onChange={(value) => onChange({ ...data, [key]: value })}
    />
  );
  return (
    <>
      <details className="editor-details">
        <summary>Panneau et ouverture vers le quotidien</summary>
        {text("panelInvitation", "Invitation du panneau")}
        {text("qrCaption", "Phrase sous le QR code")}
        {text("everyday", "Et dans votre quotidien ?")}
        <Field label="Ondographe">
          <select
            value={data.wave}
            onChange={(e) =>
              onChange({ ...data, wave: z.enum(waves).parse(e.target.value) })
            }
          >
            {waves.map((wave, i) => (
              <option value={wave} key={wave}>
                Variation {i + 1} · {waveLabels[wave]}
              </option>
            ))}
          </select>
        </Field>
      </details>
      <details className="editor-details">
        <summary>Notes de conception · équipe</summary>
        <p className="muted">
          Ces notes ne sont pas affichées dans le Player. Elles restent
          présentes dans le JSON exporté.
        </p>
        {text("learning", "Apprentissage sensible visé")}
        {text("competency", "Compétence de prendre-soin")}
        {text("transpositions", "Transpositions possibles")}
        {text("vigilance", "Vigilances")}
        {text("location", "Emplacement précis")}
        {text("owner", "Responsable")}
        {text("illustrationCredit", "Illustration et crédits")}
        <Field label="État éditorial">
          <select
            value={data.status}
            onChange={(e) =>
              onChange({
                ...data,
                status: EditorialSchema.shape.status.parse(e.target.value),
              })
            }
          >
            <option value="draft">À rédiger / produire</option>
            <option value="review">À relire / tester</option>
            <option value="approved">Validé</option>
          </select>
        </Field>
      </details>
    </>
  );
}
export function Ondograph({
  wave,
  playing = false,
}: {
  wave: (typeof waves)[number];
  playing?: boolean;
}) {
  const variation = waves.indexOf(wave);
  return (
    <svg
      className={"ondograph " + (playing ? "is-playing" : "")}
      data-wave={wave}
      viewBox="0 0 320 150"
      aria-hidden="true"
    >
      <ellipse cx="160" cy="75" rx="120" ry="55" fill="#e8f0f2" />
      {Array.from({ length: 7 }, (_, i) => {
        const y = 38 + i * 12;
        const a = 5 + variation * 1.3 + i * 1.5;
        return (
          <path
            key={i}
            d={`M 18 ${y} C 70 ${y - a}, 87 ${y + a}, 137 ${y} S 230 ${y - a}, 300 ${y + (i % 2 ? 3 : -3)}`}
            fill="none"
            stroke={i % 2 ? "#587c91" : "#92a9b5"}
            strokeWidth={i % 3 === 0 ? 1.8 : 1}
            opacity={0.35 + i * 0.065}
            style={{ animationDelay: `${i * -0.8}s` }}
          />
        );
      })}
    </svg>
  );
}
function Everyday({ text }: { text: string }) {
  return text ? (
    <section className="everyday">
      <h3>Et dans votre quotidien ?</h3>
      <p>{text}</p>
    </section>
  ) : null;
}
function Recording({
  url,
  transcript = "",
  credits = "",
  onPlaying,
}: {
  url: string;
  transcript?: string;
  credits?: string;
  onPlaying: (state: boolean) => void;
}) {
  return (
    <>
      {url ? (
        <audio
          key={url}
          aria-label="Écouter le paysage sonore"
          controls
          preload="none"
          src={url}
          onPlay={() => onPlaying(true)}
          onPause={() => onPlaying(false)}
          onEnded={() => onPlaying(false)}
          onError={() => onPlaying(false)}
        />
      ) : (
        <p className="notice">Cette création sonore est en préparation.</p>
      )}
      {transcript && (
        <details>
          <summary>Description accessible / transcription</summary>
          <p className="prose">{transcript}</p>
        </details>
      )}
      {credits && <p className="audio-credits">{credits}</p>}
    </>
  );
}
function SeasonalPlayer({ data }: { data: Content }) {
  const d = SeasonalV11Schema.parse(data);
  const [season, setSeason] = useState(seasonAt());
  const [playing, setPlaying] = useState(false);
  const url = d.seasons[season] || d.url;
  return (
    <>
      <span className="eyebrow">Au fil des saisons</span>
      <Ondograph wave={d.editorial.wave} playing={playing} />
      <p className="invitation">{d.invitation}</p>
      <div className="seasons" aria-label="Choisir la saison">
        {seasons.map((s) => (
          <button
            key={s}
            aria-pressed={s === season}
            onClick={() => {
              if ((d.seasons[s] || d.url) !== url) setPlaying(false);
              setSeason(s);
            }}
          >
            {labels[s]}
          </button>
        ))}
      </div>
      <p className="prose">{d.notes[season]}</p>
      <Recording
        url={url}
        transcript={d.transcript}
        credits={d.credits}
        onPlaying={setPlaying}
      />
      <Everyday text={d.editorial.everyday} />
    </>
  );
}
export function nextSurpriseIndex(
  length: number,
  current: number,
  random = Math.random,
) {
  if (length < 1) return -1;
  if (length === 1) return 0;
  if (current < 0 || current >= length)
    return Math.min(length - 1, Math.floor(random() * length));
  const offset = 1 + Math.min(length - 2, Math.floor(random() * (length - 1)));
  return (current + offset + length) % length;
}
function SurprisePlayer({ data }: { data: Content }) {
  const d = SurpriseSchema.parse(data);
  const tracks = d.collection.filter((t) => t.url);
  const [id, setId] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const current = tracks.find((t) => t.id === id);
  return (
    <>
      <span className="eyebrow">Une écoute libre et surprise</span>
      <Ondograph wave={d.editorial.wave} playing={playing} />
      <p className="invitation">{d.invitation}</p>
      {tracks.length ? (
        <>
          <button
            className="primary"
            onClick={() => {
              const i = tracks.findIndex((t) => t.id === id);
              setId(tracks[nextSurpriseIndex(tracks.length, i)]?.id);
              setPlaying(false);
            }}
          >
            {current ? "Une autre écoute" : "Découvrir une écoute"}
          </button>
          {current && (
            <section key={current.id}>
              <h3>{current.title}</h3>
              <Recording
                url={current.url}
                transcript={current.description}
                credits={current.credits}
                onPlaying={setPlaying}
              />
            </section>
          )}
        </>
      ) : (
        <p className="notice">La collection sonore est en préparation.</p>
      )}
      <Everyday text={d.editorial.everyday} />
    </>
  );
}
const inSitu: ExperienceDefinition = {
  type: "in-situ",
  glyph: "◌",
  label: "Écoute in situ",
  description: "Ouvrir une parenthèse, là où l’on se trouve.",
  schema: InSituV11Schema,
  defaults: () => ({
    invitation:
      "Prenez un instant pour écouter ce lieu. Quels sons viennent à votre rencontre ?",
    duration: 60,
    editorial: editorialDefaults(),
  }),
  Editor: ({ data, onChange }) => {
    const d = InSituV11Schema.parse(data);
    return (
      <>
        <Text
          label="Invitation à écouter"
          value={d.invitation}
          onChange={(invitation) => onChange({ ...d, invitation })}
        />
        <Field label="Afficher une durée indicative">
          <input
            type="checkbox"
            checked={d.duration !== null}
            onChange={(e) =>
              onChange({ ...d, duration: e.target.checked ? 60 : null })
            }
          />
        </Field>
        {d.duration !== null && (
          <Field label="Durée indicative (secondes)">
            <input
              type="number"
              min={10}
              max={3600}
              value={d.duration}
              onChange={(e) => {
                const duration = Number(e.target.value);
                if (
                  Number.isInteger(duration) &&
                  duration >= 10 &&
                  duration <= 3600
                )
                  onChange({ ...d, duration });
              }}
            />
          </Field>
        )}
        <EditorialEditor
          data={d.editorial}
          onChange={(editorial) => onChange({ ...d, editorial })}
        />
      </>
    );
  },
  Player: ({ data }) => {
    const d = InSituV11Schema.parse(data);
    return (
      <>
        <span className="eyebrow">Écoute sur place</span>
        <Ondograph wave={d.editorial.wave} />
        <p className="invitation">{d.invitation}</p>
        {d.duration !== null && (
          <span className="pill">
            Environ {d.duration} secondes · À votre rythme
          </span>
        )}
        <Everyday text={d.editorial.everyday} />
      </>
    );
  },
};
const audio: ExperienceDefinition = {
  type: "audio",
  glyph: "≋",
  label: "Paysage audio",
  description: "Prolonger la rencontre par un enregistrement.",
  schema: AudioV11Schema,
  defaults: () => ({
    invitation: "Un paysage à écouter, les yeux ouverts ou fermés.",
    url: "",
    transcript: "",
    credits: "",
    editorial: editorialDefaults(),
  }),
  Editor: ({ data, onChange }) => {
    const d = AudioV11Schema.extend({ url: stringUrl }).parse(data);
    return (
      <>
        <Text
          label="Invitation"
          value={d.invitation}
          onChange={(invitation) => onChange({ ...d, invitation })}
        />
        <Url
          label="Adresse du son (HTTPS)"
          value={d.url}
          onChange={(url) => onChange({ ...d, url })}
        />
        <Text
          label="Transcription accessible"
          value={d.transcript}
          maxLength={20000}
          onChange={(transcript) => onChange({ ...d, transcript })}
        />
        <Text
          label="Crédits audio"
          value={d.credits}
          onChange={(credits) => onChange({ ...d, credits })}
        />
        <EditorialEditor
          data={d.editorial}
          onChange={(editorial) => onChange({ ...d, editorial })}
        />
      </>
    );
  },
  Player: ({ data }) => {
    const d = AudioV11Schema.parse(data);
    const [playing, setPlaying] = useState(false);
    return (
      <>
        <span className="eyebrow">Paysage audio</span>
        <Ondograph wave={d.editorial.wave} playing={playing} />
        <p className="invitation">{d.invitation}</p>
        <Recording
          url={d.url}
          transcript={d.transcript}
          credits={d.credits}
          onPlaying={setPlaying}
        />
        <Everyday text={d.editorial.everyday} />
      </>
    );
  },
};
const seasonal: ExperienceDefinition = {
  type: "seasonal",
  glyph: "❋",
  label: "Écoute saisonnière",
  description: "Retrouver un lieu à travers ses quatre saisons.",
  schema: SeasonalV11Schema,
  defaults: () => ({
    invitation: "Un même lieu, quatre façons de résonner.",
    url: "",
    transcript: "",
    credits: "",
    seasons: { spring: "", summer: "", autumn: "", winter: "" },
    notes: {
      spring: "Le réveil du vivant.",
      summer: "La pleine présence.",
      autumn: "Les métamorphoses.",
      winter: "Les sons se font rares.",
    },
    editorial: editorialDefaults(),
  }),
  Editor: ({ data, onChange }) => {
    const d = SeasonalV11Schema.extend({
      url: stringUrl,
      seasons: z.object({
        spring: stringUrl,
        summer: stringUrl,
        autumn: stringUrl,
        winter: stringUrl,
      }),
    }).parse(data);
    return (
      <>
        <Text
          label="Invitation"
          value={d.invitation}
          onChange={(invitation) => onChange({ ...d, invitation })}
        />
        <Url
          label="Création sonore principale (HTTPS)"
          value={d.url}
          onChange={(url) => onChange({ ...d, url })}
        />
        <p className="muted">
          Une création principale pour les quatre saisons. Les variantes audio
          sont facultatives.
        </p>
        {seasons.map((s) => (
          <fieldset key={s}>
            <legend>{labels[s]}</legend>
            <Text
              label={"Texte · " + labels[s]}
              value={d.notes[s]}
              onChange={(text) =>
                onChange({ ...d, notes: { ...d.notes, [s]: text } })
              }
            />
            <Url
              label={"Son · " + labels[s]}
              value={d.seasons[s]}
              onChange={(url) =>
                onChange({ ...d, seasons: { ...d.seasons, [s]: url } })
              }
            />
          </fieldset>
        ))}
        <Text
          label="Description accessible / transcription"
          maxLength={20000}
          value={d.transcript}
          onChange={(transcript) => onChange({ ...d, transcript })}
        />
        <Text
          label="Crédits audio"
          value={d.credits}
          onChange={(credits) => onChange({ ...d, credits })}
        />
        <EditorialEditor
          data={d.editorial}
          onChange={(editorial) => onChange({ ...d, editorial })}
        />
      </>
    );
  },
  Player: SeasonalPlayer,
};
const surprise: ExperienceDefinition = {
  type: "surprise",
  glyph: "✧",
  label: "Écoute surprise",
  description: "Découvrir une collection, en gardant le choix.",
  schema: SurpriseSchema,
  defaults: () => ({
    invitation: "Laissez une place à l’inattendu.",
    collection: [],
    editorial: editorialDefaults(),
  }),
  Editor: ({ data, onChange }) => {
    const d = SurpriseSchema.safeParse(data).success
      ? SurpriseSchema.parse(data)
      : z
          .object({
            invitation: z.string(),
            editorial: EditorialSchema,
            collection: z.array(
              TrackSchema.extend({ title: z.string(), url: z.string() }),
            ),
          })
          .parse(data);
    return (
      <>
        <Text
          label="Invitation"
          value={d.invitation}
          onChange={(invitation) => onChange({ ...d, invitation })}
        />
        {d.collection.map((track, i) => (
          <fieldset key={track.id}>
            <legend>Création {i + 1}</legend>
            <Text
              label={"Titre de la création " + (i + 1)}
              maxLength={160}
              value={track.title}
              onChange={(title) =>
                onChange({
                  ...d,
                  collection: d.collection.map((t) =>
                    t.id === track.id ? { ...t, title } : t,
                  ),
                })
              }
            />
            <Url
              label={"Audio de la création " + (i + 1)}
              value={track.url}
              onChange={(url) =>
                onChange({
                  ...d,
                  collection: d.collection.map((t) =>
                    t.id === track.id ? { ...t, url } : t,
                  ),
                })
              }
            />
            <Text
              label={"Description de la création " + (i + 1)}
              maxLength={20000}
              value={track.description}
              onChange={(description) =>
                onChange({
                  ...d,
                  collection: d.collection.map((t) =>
                    t.id === track.id ? { ...t, description } : t,
                  ),
                })
              }
            />
            <Text
              label={"Crédits de la création " + (i + 1)}
              value={track.credits}
              onChange={(credits) =>
                onChange({
                  ...d,
                  collection: d.collection.map((t) =>
                    t.id === track.id ? { ...t, credits } : t,
                  ),
                })
              }
            />
            <button
              onClick={() =>
                onChange({
                  ...d,
                  collection: d.collection.filter((t) => t.id !== track.id),
                })
              }
            >
              Retirer cette création
            </button>
          </fieldset>
        ))}
        <button
          disabled={d.collection.length >= 100}
          onClick={() =>
            onChange({
              ...d,
              collection: [
                ...d.collection,
                {
                  id: crypto.randomUUID(),
                  title: "Nouvelle création",
                  url: "",
                  description: "",
                  credits: "",
                },
              ],
            })
          }
        >
          Ajouter une création sonore
        </button>
        <EditorialEditor
          data={d.editorial}
          onChange={(editorial) => onChange({ ...d, editorial })}
        />
      </>
    );
  },
  Player: SurprisePlayer,
};
export const soundscapesModuleV11: StudioModule = {
  id: "soundscapes",
  version: "1.1.0",
  sdkVersion: "1.0.0",
  label: "Parcours sonores",
  experiences: [inSitu, audio, seasonal, surprise],
  projectSchema: ProjectContentSchema,
  ProjectEditor: ProjectContentEditor,
  ProjectIntro,
  ProjectFooter,
};
