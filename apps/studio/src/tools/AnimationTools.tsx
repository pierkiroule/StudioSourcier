import { Field } from "@sourciers/design-system";
import {
  generatedSvg,
  validateSvg,
  type Appearance,
  type Animation,
} from "@sourciers/studio-tools";
import type { Stop } from "@sourciers/core";
import type { Template } from "../local/repository";
import { downloadFile } from "../local/archive";
import { Range } from "./fields";
interface Props {
  appearance: Appearance;
  updateAppearance: (a: Appearance) => void;
  animation: Animation;
  updateAnimation: (a: Animation) => void;
  scope: "project" | "stop";
  setScope: (s: "project" | "stop") => void;
  stop: Stop | undefined;
  svgDraft: string;
  setSvgDraft: (s: string) => void;
  svgDirty: boolean;
  setSvgDirty: (b: boolean) => void;
  svgError: string;
  setSvgError: (s: string) => void;
  setMessage: (s: string) => void;
  saveTemplate: (kind: Template["kind"]) => void;
}

export function AnimationTools({
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
}: Props) {
  return (
    <>
      <span className="eyebrow">Un mouvement à votre rythme</span>
      <h2>Ondographe</h2>
      <Field label="Appliquer les réglages à">
        <select
          value={scope}
          onChange={(e) => {
            if (svgDirty) {
              setMessage(
                "Appliquez ou abandonnez la source SVG avant de changer de portée.",
              );
              return;
            }
            setScope(e.target.value === "stop" ? "stop" : "project");
          }}
        >
          <option value="project">Tout le parcours</option>
          <option value="stop" disabled={!stop}>
            Cette escale seulement
          </option>
        </select>
      </Field>
      <div className="pro-preset-row">
        <button
          onClick={() => {
            setSvgDirty(false);
            updateAnimation({
              ...animation,
              density: 5,
              speed: 14,
              amplitude: 6,
              customSvg: "",
            });
          }}
        >
          Calme
        </button>
        <button
          onClick={() => {
            setSvgDirty(false);
            updateAnimation({
              ...animation,
              density: 11,
              speed: 7,
              amplitude: 18,
              customSvg: "",
            });
          }}
        >
          Fluide
        </button>
        <button
          onClick={() => {
            setSvgDirty(false);
            updateAnimation({
              ...animation,
              density: 8,
              speed: 4,
              amplitude: 25,
              customSvg: "",
            });
          }}
        >
          Vibrant
        </button>
      </div>
      <Range
        label="Nombre de lignes"
        value={animation.density}
        min={3}
        max={18}
        onChange={(density) =>
          updateAnimation({
            ...animation,
            density,
            customSvg: "",
          })
        }
      />
      <Range
        label="Durée d’un mouvement (s)"
        value={animation.speed}
        min={2}
        max={20}
        onChange={(speed) =>
          updateAnimation({ ...animation, speed, customSvg: "" })
        }
      />
      <Range
        label="Amplitude"
        value={animation.amplitude}
        min={0}
        max={30}
        onChange={(amplitude) =>
          updateAnimation({
            ...animation,
            amplitude,
            customSvg: "",
          })
        }
      />
      <Range
        label="Épaisseur du trait"
        value={animation.thickness}
        min={0.5}
        max={5}
        step={0.5}
        onChange={(thickness) =>
          updateAnimation({
            ...animation,
            thickness,
            customSvg: "",
          })
        }
      />
      <button
        aria-pressed={animation.paused}
        onClick={() =>
          updateAnimation({
            ...animation,
            paused: !animation.paused,
          })
        }
      >
        {animation.paused
          ? "Activer le mouvement"
          : "Mettre le mouvement en pause"}
      </button>
      {scope === "stop" && stop && appearance.overrides[stop.id] && (
        <button
          onClick={() => {
            const overrides = { ...appearance.overrides };
            delete overrides[stop.id];
            updateAppearance({ ...appearance, overrides });
            setSvgDirty(false);
          }}
        >
          Reprendre les réglages du parcours
        </button>
      )}
      <button onClick={() => saveTemplate("animation")}>
        Enregistrer cet Ondographe
      </button>
      <details className="pro-code-panel">
        <summary>Code SVG avancé</summary>
        <p className="pro-helper">
          SVG autonome avec animations déclaratives. Pas de JavaScript ni de
          ressource externe. Validez la source pour l’appliquer.
        </p>
        <textarea
          aria-label="Source SVG de l’Ondographe"
          className="pro-code-editor"
          rows={12}
          maxLength={100000}
          spellCheck={false}
          value={svgDraft}
          onChange={(e) => {
            setSvgDraft(e.target.value);
            setSvgDirty(true);
            setSvgError("");
          }}
        />
        {svgDirty && (
          <p className="pro-helper">
            Source non appliquée. Elle n’est pas encore sauvegardée.
          </p>
        )}
        {svgError && (
          <p role="alert" className="pro-error">
            {svgError}
          </p>
        )}
        <button
          className="primary"
          onClick={() => {
            try {
              const clean = validateSvg(svgDraft);
              updateAnimation({ ...animation, customSvg: clean });
              setSvgDraft(clean);
              setSvgDirty(false);
              setSvgError("");
            } catch (error) {
              setSvgError(
                error instanceof Error ? error.message : "SVG invalide",
              );
            }
          }}
        >
          Valider et appliquer le SVG
        </button>
        <button
          onClick={() => {
            setSvgDirty(false);
            setSvgError("");
            setSvgDraft(
              animation.customSvg ||
                generatedSvg(animation, appearance.theme.primary),
            );
          }}
        >
          Revenir à la source appliquée
        </button>
        <button
          onClick={() =>
            downloadFile(
              new Blob(
                [
                  validateSvg(
                    animation.customSvg ||
                      generatedSvg(animation, appearance.theme.primary),
                  ),
                ],
                { type: "image/svg+xml" },
              ),
              "ondographe.svg",
            )
          }
        >
          Exporter le SVG
        </button>
      </details>
    </>
  );
}
