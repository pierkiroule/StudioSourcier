import { Field } from "@sourciers/design-system";
import { themes, ThemeSchema, type Appearance } from "@sourciers/studio-tools";
import type { Template } from "../local/repository";
import { Range } from "./fields";
interface Props {
  appearance: Appearance;
  updateAppearance: (a: Appearance) => void;
  templates: Template[];
  saveTemplate: (kind: Template["kind"]) => void;
}

export function ThemeTools({
  appearance,
  updateAppearance,
  templates,
  saveTemplate,
}: Props) {
  return (
    <>
      <span className="eyebrow">L’identité de votre parcours</span>
      <h2>Charte graphique</h2>
      <div className="pro-theme-presets">
        {themes.map((t) => (
          <button
            key={t.name}
            onClick={() => updateAppearance({ ...appearance, theme: { ...t } })}
          >
            <span style={{ background: t.primary }} />
            {t.name}
          </button>
        ))}
      </div>
      <Field label="Nom de la charte">
        <input
          maxLength={80}
          value={appearance.theme.name}
          onChange={(e) =>
            updateAppearance({
              ...appearance,
              theme: {
                ...appearance.theme,
                name: e.target.value,
              },
            })
          }
        />
      </Field>
      {(["primary", "ink", "paper", "surface", "accent"] as const).map(
        (key) => (
          <Field
            key={key}
            label={
              {
                primary: "Couleur principale",
                ink: "Texte",
                paper: "Fond de page",
                surface: "Cartes et panneaux",
                accent: "Accent",
              }[key]
            }
          >
            <div className="pro-color">
              <input
                aria-label={
                  {
                    primary: "Couleur principale",
                    ink: "Couleur du texte",
                    paper: "Couleur du fond",
                    surface: "Couleur des cartes",
                    accent: "Couleur d’accent",
                  }[key]
                }
                type="color"
                value={appearance.theme[key]}
                onChange={(e) =>
                  updateAppearance({
                    ...appearance,
                    theme: {
                      ...appearance.theme,
                      [key]: e.target.value,
                    },
                  })
                }
              />
              <code>{appearance.theme[key]}</code>
            </div>
          </Field>
        ),
      )}
      <Field label="Typographie">
        <select
          value={appearance.theme.font}
          onChange={(e) =>
            updateAppearance({
              ...appearance,
              theme: {
                ...appearance.theme,
                font: ThemeSchema.shape.font.parse(e.target.value),
              },
            })
          }
        >
          <option value="sans">Sans serif · contemporain</option>
          <option value="serif">Serif · éditorial</option>
        </select>
      </Field>
      <Range
        label="Arrondi des formes"
        min={0}
        max={32}
        value={appearance.theme.radius}
        onChange={(radius) =>
          updateAppearance({
            ...appearance,
            theme: { ...appearance.theme, radius },
          })
        }
      />
      <p className="pro-helper">
        Cette charte s’applique à toutes les escales du projet.
      </p>
      <button onClick={() => saveTemplate("theme")}>
        Enregistrer la charte comme modèle
      </button>
      {templates
        .filter((t) => t.kind === "theme")
        .map((t) => (
          <button
            key={t.id}
            onClick={() =>
              updateAppearance({
                ...appearance,
                theme: ThemeSchema.parse(t.data),
              })
            }
          >
            Appliquer {t.name}
          </button>
        ))}
    </>
  );
}
