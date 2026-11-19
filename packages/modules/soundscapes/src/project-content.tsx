import { useState } from "react";
import { z } from "zod";
import { Field } from "@sourciers/design-system";
import { AudioUrlSchema } from "@sourciers/media";
import type { Project } from "@sourciers/core";
export const ProjectContentSchema = z
  .object({
    version: z.literal("1.0.0"),
    subtitle: z.string().max(300),
    cta: z.string().max(120),
    location: z.string().max(300),
    status: z.string().max(300),
    about: z.string().max(4000),
    accessibility: z.string().max(4000),
    partnerHeading: z.string().max(300),
    partners: z
      .array(
        z
          .object({
            id: z.uuid(),
            name: z.string().max(200),
            logo: AudioUrlSchema,
            url: AudioUrlSchema,
          })
          .strict(),
      )
      .max(30),
    feedback: z
      .object({
        question: z.string().max(300),
        instruction: z.string().max(1000),
        tags: z.array(z.string().max(200)).min(1).max(20),
        commentLabel: z.string().max(300),
        commentPlaceholder: z.string().max(1000),
        privacy: z.string().max(2000),
        exclusiveTag: z.number().int().min(0),
      })
      .strict(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.feedback.exclusiveTag >= d.feedback.tags.length)
      ctx.addIssue({ code: "custom", message: "Tag exclusif absent" });
  });
type Settings = z.infer<typeof ProjectContentSchema>;
type Props = { data: Project["extensions"][string] };
export function ProjectContentEditor({
  data,
  onChange,
}: Props & { onChange: (data: Project["extensions"][string]) => void }) {
  // Allow incomplete URL entry without weakening the persistence boundary.
  const schema = z.object({
    version: z.literal("1.0.0"),
    subtitle: z.string(),
    cta: z.string(),
    location: z.string(),
    status: z.string(),
    about: z.string(),
    accessibility: z.string(),
    partnerHeading: z.string(),
    partners: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        logo: z.string(),
        url: z.string(),
      }),
    ),
    feedback: z.object({
      question: z.string(),
      instruction: z.string(),
      tags: z.array(z.string()),
      commentLabel: z.string(),
      commentPlaceholder: z.string(),
      privacy: z.string(),
      exclusiveTag: z.number(),
    }),
  });
  const d = schema.parse(data);
  const field = (
    key:
      | "subtitle"
      | "cta"
      | "location"
      | "status"
      | "about"
      | "accessibility"
      | "partnerHeading",
    label: string,
    maxLength = 300,
  ) => (
    <Field label={label}>
      <textarea
        rows={key === "about" || key === "accessibility" ? 3 : 2}
        maxLength={maxLength}
        value={d[key]}
        onChange={(e) => onChange({ ...d, [key]: e.target.value })}
      />
    </Field>
  );
  return (
    <div className="project-settings">
      {field("subtitle", "Sous-titre public")}
      {field("cta", "Bouton d’exploration", 120)}
      {field("location", "Lieu du parcours")}
      {field("status", "Statut du contenu")}
      {field("about", "À propos du parcours", 4000)}
      {field(
        "accessibility",
        "Accessibilité et liberté de participation",
        4000,
      )}
      <h3>Crédits et partenaires</h3>
      {field("partnerHeading", "Mention partenaires")}
      {d.partners.map((partner, i) => (
        <fieldset key={partner.id}>
          <legend>Partenaire {i + 1}</legend>
          {(["name", "logo", "url"] as const).map((key) => (
            <Field
              key={key}
              label={
                {
                  name: "Nom officiel",
                  logo: "Logo (HTTPS)",
                  url: "Site (HTTPS)",
                }[key]
              }
            >
              <input
                maxLength={key === "name" ? 200 : undefined}
                value={partner[key]}
                onChange={(e) =>
                  onChange({
                    ...d,
                    partners: d.partners.map((p) =>
                      p.id === partner.id ? { ...p, [key]: e.target.value } : p,
                    ),
                  })
                }
              />
            </Field>
          ))}
          <button
            onClick={() =>
              onChange({
                ...d,
                partners: d.partners.filter((p) => p.id !== partner.id),
              })
            }
          >
            Retirer ce partenaire
          </button>
        </fieldset>
      ))}
      <button
        disabled={d.partners.length >= 30}
        onClick={() =>
          onChange({
            ...d,
            partners: [
              ...d.partners,
              { id: crypto.randomUUID(), name: "", logo: "", url: "" },
            ],
          })
        }
      >
        Ajouter un partenaire
      </button>
      <h3>Retour facultatif · contenu du formulaire</h3>
      <p className="notice">
        Aperçu uniquement : aucun retour n’est envoyé. La collecte partagée
        n’est pas encore connectée.
      </p>
      {(
        [
          "question",
          "instruction",
          "commentLabel",
          "commentPlaceholder",
          "privacy",
        ] as const
      ).map((key) => (
        <Field
          key={key}
          label={
            {
              question: "Question du retour",
              instruction: "Consigne du retour",
              commentLabel: "Libellé du commentaire",
              commentPlaceholder: "Exemple de commentaire",
              privacy: "Information de confidentialité",
            }[key]
          }
        >
          <textarea
            rows={2}
            maxLength={
              {
                question: 300,
                instruction: 1000,
                commentLabel: 300,
                commentPlaceholder: 1000,
                privacy: 2000,
              }[key]
            }
            value={d.feedback[key]}
            onChange={(e) =>
              onChange({
                ...d,
                feedback: { ...d.feedback, [key]: e.target.value },
              })
            }
          />
        </Field>
      ))}
      {d.feedback.tags.map((tag, i) => (
        <Field key={i} label={"Tag " + (i + 1)}>
          <input
            maxLength={200}
            value={tag}
            onChange={(e) =>
              onChange({
                ...d,
                feedback: {
                  ...d.feedback,
                  tags: d.feedback.tags.map((t, j) =>
                    i === j ? e.target.value : t,
                  ),
                },
              })
            }
          />
        </Field>
      ))}
    </div>
  );
}
export function ProjectIntro({ data }: Props) {
  const d = ProjectContentSchema.parse(data);
  return (
    <div className="journey-intro">
      <p className="journey-subtitle">{d.subtitle}</p>
      <p className="muted">{d.location}</p>
      <p className="draft-banner">{d.status}</p>
      <a className="button primary" href="#escales">
        {d.cta}
      </a>
      <details>
        <summary>À propos et accessibilité</summary>
        <p className="prose">{d.about}</p>
        <p className="prose">{d.accessibility}</p>
      </details>
    </div>
  );
}
export function toggleFeedbackTag(
  selected: number[],
  index: number,
  exclusive: number,
): number[] {
  if (selected.includes(index)) return selected.filter((n) => n !== index);
  const keep =
    index === exclusive
      ? selected.filter((n) => n > exclusive)
      : index < exclusive
        ? selected.filter((n) => n !== exclusive)
        : selected;
  return [...keep, index];
}
export function FeedbackPreview({
  settings,
}: {
  settings: Settings["feedback"];
}) {
  const [tags, setTags] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  return (
    <details className="feedback-preview">
      <summary>Partager mon retour</summary>
      <h3>{settings.question}</h3>
      <p>{settings.instruction}</p>
      <div className="feedback-tags">
        {settings.tags.map((tag, i) => (
          <button
            key={i}
            aria-pressed={tags.includes(i)}
            onClick={() =>
              setTags(toggleFeedbackTag(tags, i, settings.exclusiveTag))
            }
          >
            {tag}
          </button>
        ))}
      </div>
      <Field label={settings.commentLabel}>
        <textarea
          rows={4}
          maxLength={4000}
          placeholder={settings.commentPlaceholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Field>
      <p className="muted">{settings.privacy}</p>
      <p className="notice" role="status">
        Aperçu du formulaire : la collecte des retours n’est pas encore activée.
        Rien n’est envoyé.
      </p>
      <button disabled>Envoi non configuré</button>
    </details>
  );
}
export function ProjectFooter({ data }: Props) {
  const d = ProjectContentSchema.parse(data);
  return (
    <>
      <FeedbackPreview settings={d.feedback} />
      <section className="partners">
        <h3>{d.partnerHeading}</h3>
        {d.partners.length ? (
          <div className="partner-list">
            {d.partners.map((p) => (
              <div key={p.id}>
                {p.logo && (
                  <img src={p.logo} alt={p.name || "Logo partenaire"} />
                )}
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.name || "Partenaire"}
                  </a>
                ) : (
                  <span>{p.name || "Nom à compléter"}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Espace réservé aux partenaires · logos à compléter
          </p>
        )}
      </section>
    </>
  );
}
