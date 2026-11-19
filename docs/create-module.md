# Créer un module

1. Ajouter `packages/modules/<id>/package.json` et `src/index.tsx`.
2. Déclarer le package `@sourciers/<id>`, l’export source et ses dépendances explicites au SDK, à Zod et à React.
3. Pour chaque expérience : définir un schéma Zod strict, des défauts valides, un Editor contrôlé et un Player. Les données sont sérialisables en JSON.
4. Exporter un StudioModule avec ID unique, version de contenu et sdkVersion.
5. Ajouter le package workspace aux dépendances de Studio et Player, puis enregistrer le module dans leurs points de composition. Ajouter son alias TypeScript et celui du script publisher si nécessaire.
6. Tester ses défauts, ses contenus invalides, son enregistrement et son parcours édition/lecture/publication.

```tsx
import { z } from "zod";
import type { StudioModule } from "@sourciers/module-sdk";

const schema = z.object({ text: z.string().max(4000) }).strict();

export const observationModule: StudioModule = {
  id: "observation",
  version: "1.0.0",
  sdkVersion: "1.0.0",
  label: "Observation",
  experiences: [
    {
      type: "regarder",
      label: "Regarder autrement",
      description: "Une invitation visuelle.",
      glyph: "◉",
      schema,
      defaults: () => ({ text: "" }),
      Editor: ({ data, onChange }) => {
        const value = schema.parse(data);
        return (
          <label>
            Invitation
            <textarea
              value={value.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </label>
        );
      },
      Player: ({ data }) => <p>{schema.parse(data).text}</p>,
    },
  ],
};
```

Les éditeurs doivent tolérer les saisies intermédiaires invalides : conserver un état de saisie permissif ou valider avant engagement. Le Player et les frontières de sauvegarde restent stricts. Voir les champs d’URL dans soundscapes.

Le registre fonctionne par installation de packages et compilation. « Module indépendant » ne signifie pas installation à chaud : aucun catalogue, gestionnaire de plugins ou exécution de code tiers n’est inclus dans la V0.1.
