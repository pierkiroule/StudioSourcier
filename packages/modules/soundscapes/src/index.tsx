import { useState } from "react";
import { z } from "zod";
import type {
  Content,
  ExperienceDefinition,
  StudioModule,
} from "@sourciers/module-sdk";
import { AudioUrlSchema } from "@sourciers/media";
import { Field } from "@sourciers/design-system";
export const seasons = ["spring", "summer", "autumn", "winter"] as const;
const labels = {
  spring: "Printemps",
  summer: "Été",
  autumn: "Automne",
  winter: "Hiver",
};
export const InSituSchema = z
  .object({
    invitation: z.string().max(4000),
    duration: z.number().int().min(10).max(3600),
  })
  .strict();
export const AudioSchema = z
  .object({
    invitation: z.string().max(4000),
    url: AudioUrlSchema,
    transcript: z.string().max(20000),
  })
  .strict();
export const SeasonalSchema = z
  .object({
    invitation: z.string().max(4000),
    seasons: z
      .object({
        spring: AudioUrlSchema,
        summer: AudioUrlSchema,
        autumn: AudioUrlSchema,
        winter: AudioUrlSchema,
      })
      .strict(),
    notes: z
      .object({
        spring: z.string().max(4000),
        summer: z.string().max(4000),
        autumn: z.string().max(4000),
        winter: z.string().max(4000),
      })
      .strict(),
  })
  .strict();
function Text({
  label,
  value,
  onChange,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  maxLength?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </Field>
  );
}
function Audio({ url, transcript }: { url: string; transcript?: string }) {
  return (
    <>
      {url ? (
        <audio
          aria-label="Écouter le paysage sonore"
          controls
          preload="none"
          src={url}
        >
          Votre navigateur ne prend pas en charge l’audio.
        </audio>
      ) : (
        <p className="notice">Aucun son associé pour le moment.</p>
      )}
      {transcript && (
        <details>
          <summary>Transcription</summary>
          <p className="prose">{transcript}</p>
        </details>
      )}
    </>
  );
}
const inSitu: ExperienceDefinition = {
  type: "in-situ",
  glyph: "◌",
  label: "Écoute in situ",
  description: "Ouvrir une parenthèse, là où l’on se trouve.",
  schema: InSituSchema,
  defaults: () => ({
    invitation:
      "Prenez un instant pour écouter ce lieu. Quels sons viennent à votre rencontre ?",
    duration: 60,
  }),
  Editor: ({ data, onChange }) => {
    const d = InSituSchema.parse(data);
    return (
      <>
        <Text
          label="Invitation à écouter"
          value={d.invitation}
          onChange={(invitation) => onChange({ ...d, invitation })}
        />
        <Field label="Durée indicative (secondes)">
          <input
            type="number"
            min={10}
            max={3600}
            value={d.duration}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 10 && n <= 3600)
                onChange({ ...d, duration: n });
            }}
          />
        </Field>
      </>
    );
  },
  Player: ({ data }) => {
    const d = InSituSchema.parse(data);
    return (
      <>
        <span className="eyebrow">Écoute in situ</span>
        <div className="listening-orb" aria-hidden="true">
          ◌
        </div>
        <p className="invitation">{d.invitation}</p>
        <span className="pill">
          Environ {d.duration} secondes · À votre rythme
        </span>
      </>
    );
  },
};
const audio: ExperienceDefinition = {
  type: "audio",
  glyph: "≋",
  label: "Paysage audio",
  description: "Prolonger la rencontre par un enregistrement.",
  schema: AudioSchema,
  defaults: () => ({
    invitation: "Un paysage à écouter, les yeux ouverts ou fermés.",
    url: "",
    transcript: "",
  }),
  Editor: ({ data, onChange }) => {
    const d = AudioSchema.extend({ url: z.string() }).parse(data);
    return (
      <>
        <Text
          label="Invitation"
          value={d.invitation}
          onChange={(invitation) => onChange({ ...d, invitation })}
        />
        <Field
          label="Adresse du son (HTTPS)"
          hint="Utilisez l’adresse HTTPS d’un enregistrement accessible aux visiteurs."
        >
          <input
            type="url"
            value={d.url}
            placeholder="https://…"
            onChange={(e) => onChange({ ...d, url: e.target.value })}
          />
        </Field>
        <Text
          label="Transcription accessible"
          maxLength={20000}
          value={d.transcript}
          onChange={(transcript) => onChange({ ...d, transcript })}
        />
      </>
    );
  },
  Player: ({ data }) => {
    const d = AudioSchema.parse(data);
    return (
      <>
        <span className="eyebrow">Paysage audio</span>
        <div className="listening-orb" aria-hidden="true">
          ≋
        </div>
        <p className="invitation">{d.invitation}</p>
        <Audio url={d.url} transcript={d.transcript} />
      </>
    );
  },
};
export function seasonAt(date = new Date()): (typeof seasons)[number] {
  const month = date.getMonth();
  return month >= 2 && month <= 4
    ? "spring"
    : month >= 5 && month <= 7
      ? "summer"
      : month >= 8 && month <= 10
        ? "autumn"
        : "winter";
}
function SeasonalPlayer({ data }: { data: Content }) {
  const d = SeasonalSchema.parse(data);
  const [season, setSeason] = useState(seasonAt());
  return (
    <>
      <span className="eyebrow">Au fil des saisons</span>
      <div className="listening-orb" aria-hidden="true">
        ❋
      </div>
      <p className="invitation">{d.invitation}</p>
      <div className="seasons">
        {seasons.map((s) => (
          <button
            key={s}
            aria-pressed={s === season}
            onClick={() => setSeason(s)}
          >
            {labels[s]}
          </button>
        ))}
      </div>
      <p className="prose">{d.notes[season]}</p>
      <Audio key={season + d.seasons[season]} url={d.seasons[season]} />
    </>
  );
}
const seasonal: ExperienceDefinition = {
  type: "seasonal",
  glyph: "❋",
  label: "Écoute saisonnière",
  description: "Retrouver un lieu à travers ses quatre saisons.",
  schema: SeasonalSchema,
  defaults: () => ({
    invitation: "Un même lieu, quatre façons de résonner.",
    seasons: { spring: "", summer: "", autumn: "", winter: "" },
    notes: {
      spring: "Le réveil du vivant.",
      summer: "La pleine présence.",
      autumn: "Les métamorphoses.",
      winter: "Les sons se font rares.",
    },
  }),
  Editor: ({ data, onChange }) => {
    const d = SeasonalSchema.extend({
      seasons: z.object({
        spring: z.string(),
        summer: z.string(),
        autumn: z.string(),
        winter: z.string(),
      }),
    }).parse(data);
    return (
      <>
        <Text
          label="Invitation"
          value={d.invitation}
          onChange={(invitation) => onChange({ ...d, invitation })}
        />
        {seasons.map((s) => (
          <fieldset key={s}>
            <legend>{labels[s]}</legend>
            <Field label={"Son · " + labels[s]}>
              <input
                type="url"
                value={d.seasons[s]}
                placeholder="https://…"
                onChange={(e) =>
                  onChange({
                    ...d,
                    seasons: { ...d.seasons, [s]: e.target.value },
                  })
                }
              />
            </Field>
            <Text
              label={"Texte · " + labels[s]}
              value={d.notes[s]}
              onChange={(text) =>
                onChange({ ...d, notes: { ...d.notes, [s]: text } })
              }
            />
          </fieldset>
        ))}
      </>
    );
  },
  Player: SeasonalPlayer,
};
export const soundscapesModule: StudioModule = {
  id: "soundscapes",
  version: "1.0.0",
  sdkVersion: "1.0.0",
  label: "Parcours sonores",
  experiences: [inSitu, audio, seasonal],
};
