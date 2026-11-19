import { Field } from "@sourciers/design-system";
import {
  defaultLayout,
  type Layout,
  type Block,
} from "@sourciers/studio-tools";
import type { Stop } from "@sourciers/core";
import type { Asset } from "../local/repository";
import { Range, TextField, blockLabels } from "./fields";
interface Props {
  stop: Stop | undefined;
  layout: Layout;
  updateLayout: (l: Layout) => void;
  block: Block | undefined;
  assets: Asset[];
  setSelectedBlock: (id: string) => void;
}

export function BlockTools({
  stop,
  layout,
  updateLayout,
  block,
  assets,
  setSelectedBlock,
}: Props) {
  return (
    <>
      <span className="eyebrow">Une page qui reste lisible</span>
      <h2>Mise en page</h2>
      {stop ? (
        <>
          <Field label="Disposition">
            <select
              value={layout.width}
              onChange={(e) =>
                updateLayout({
                  ...layout,
                  width: e.target.value === "wide" ? "wide" : "narrow",
                })
              }
            >
              <option value="narrow">Centrée · étroite</option>
              <option value="wide">Aérée · large</option>
            </select>
          </Field>
          <Field label="Alignement du texte">
            <select
              value={layout.align}
              onChange={(e) =>
                updateLayout({
                  ...layout,
                  align: e.target.value === "left" ? "left" : "center",
                })
              }
            >
              <option value="center">Centré</option>
              <option value="left">À gauche</option>
            </select>
          </Field>
          <Range
            label="Espace entre les blocs"
            value={layout.gap}
            min={8}
            max={48}
            onChange={(gap) => updateLayout({ ...layout, gap })}
          />
          {block && (
            <fieldset className="pro-selected-block">
              <legend>{blockLabels[block.kind]}</legend>
              <Field label="Visible dans le Player">
                <input
                  type="checkbox"
                  checked={block.visible}
                  onChange={(e) =>
                    updateLayout({
                      ...layout,
                      blocks: layout.blocks.map((b) =>
                        b.id === block.id
                          ? { ...b, visible: e.target.checked }
                          : b,
                      ),
                    })
                  }
                />
              </Field>
              {block.kind === "text" && (
                <TextField
                  label="Texte du bloc"
                  maxLength={8000}
                  value={block.text}
                  onChange={(text) =>
                    updateLayout({
                      ...layout,
                      blocks: layout.blocks.map((b) =>
                        b.id === block.id ? { ...b, text } : b,
                      ),
                    })
                  }
                />
              )}
              {block.kind === "image" && (
                <>
                  <Field label="Image de la bibliothèque">
                    <select
                      value={block.assetId}
                      onChange={(e) =>
                        updateLayout({
                          ...layout,
                          blocks: layout.blocks.map((b) =>
                            b.id === block.id
                              ? { ...b, assetId: e.target.value }
                              : b,
                          ),
                        })
                      }
                    >
                      <option value="">Choisir une image</option>
                      {assets
                        .filter((a) => a.mime.startsWith("image/"))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <TextField
                    label="Description de l’image"
                    value={block.text}
                    onChange={(text) =>
                      updateLayout({
                        ...layout,
                        blocks: layout.blocks.map((b) =>
                          b.id === block.id ? { ...b, text } : b,
                        ),
                      })
                    }
                  />
                </>
              )}
              <button
                onClick={() =>
                  updateLayout({
                    ...layout,
                    blocks: layout.blocks.filter((b) => b.id !== block.id),
                  })
                }
              >
                Retirer ce bloc
              </button>
            </fieldset>
          )}
          <h3>Ajouter un bloc</h3>
          <div className="pro-add-blocks">
            {(
              [
                "text",
                "image",
                "title",
                "animation",
                "invitation",
                "seasons",
                "audio",
                "everyday",
              ] as const
            ).map((kind) => (
              <button
                key={kind}
                disabled={layout.blocks.length >= 30}
                onClick={() => {
                  const b: Block = {
                    id: crypto.randomUUID(),
                    kind,
                    visible: true,
                    text: kind === "text" ? "Votre texte…" : "",
                    assetId: "",
                  };
                  updateLayout({
                    ...layout,
                    blocks: [...layout.blocks, b],
                  });
                  setSelectedBlock(b.id);
                }}
              >
                ＋ {blockLabels[kind]}
              </button>
            ))}
          </div>
          <p className="pro-helper">
            Déplacez les blocs depuis la structure. Les dispositions s’adaptent
            aux écrans mobiles.
          </p>
          <button onClick={() => updateLayout(defaultLayout())}>
            Revenir à la disposition initiale
          </button>
        </>
      ) : (
        <p>Choisissez une escale pour organiser ses blocs.</p>
      )}
    </>
  );
}
