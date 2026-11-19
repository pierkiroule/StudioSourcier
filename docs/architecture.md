# Architecture et versions

| Répertoire                   | Responsabilité                                                  |
| ---------------------------- | --------------------------------------------------------------- |
| apps/studio                  | Composition du registre, édition, import/export et brouillon    |
| apps/player                  | Lecture des parcours, navigation et rendu commun des escales    |
| packages/core                | Schémas génériques, opérations pures, contrat ProjectRepository |
| packages/module-sdk          | Contrat versionné, registre, résolution et validation métier    |
| packages/design-system       | Champs, marque, états vides et styles communs                   |
| packages/media               | Références médias et résolution autorisée injectable            |
| packages/publisher           | Manifeste et QR SVG ; scripts/publish.mjs assemble la PWA       |
| packages/modules/soundscapes | Écoute in situ, audio et saisons                                |
| supabase/migrations          | Agrégat projet JSONB, propriété, contraintes et RLS             |

Le Core stocke une expérience opaque `{moduleId,moduleVersion,type,data}`. Le registre résout exactement le couple ID/version, puis valide `data` avec le schéma du module. Ainsi, importer un projet passe deux frontières : structure générique puis contenu métier.

Le SDK ne référence aucun module concret. Studio et Player sont les deux points de composition qui enregistrent `soundscapesModule`. Le composant StopPlayer est partagé depuis apps/player ; il ne connaît que le registre. Si ce partage grandit, il pourra devenir un package runtime indépendant. Le Studio lui-même n’est pas une PWA ; les parcours produits le sont.

## Versions

- Application racine : 0.2.0 ; packages workspace : 0.1.0.
- Schéma projet courant : 1.1.0 ; migration depuis 1.0.0.
- Contrat SDK : 1.0.0.
- Contenu du module soundscapes : 1.1.0 ; lecteur 1.0.0 conservé.

Une version exacte évite qu’une mise à jour change l’interprétation d’un ancien parcours. Le registre peut conserver plusieurs versions d’un module simultanément. Le SDK V1 exige la compatibilité exacte ; ce choix conservateur pourra évoluer avec des migrations explicites.

`parseProject` est la frontière de migration des projets. En V0.2, les documents 1.0.0 sont migrés en 1.1.0 ; les versions inconnues sont refusées. À la prochaine version : écrire une transformation pure V1 vers V2, valider le résultat puis tester l’ancien document, les erreurs et le round-trip. Le même principe s’applique aux données des modules, avec migration opt-in avant changement de moduleVersion.

## Persistance

Un agrégat contient projet, escales ordonnées et relations. La suppression d’une escale retire les relations qui la référencent. L’ordre du tableau constitue l’ordre de lecture. Les relations sont validées mais ne disposent pas d’éditeur graphique V0.1.

Le Studio conserve un seul brouillon navigateur. Le contrat ProjectRepository prépare une future bibliothèque de projets et l’adaptateur Supabase. Pas de synchronisation, de collaboration ou de résolution de conflit dans ce jalon.

## Première création et schéma 1.1.0

Depuis la livraison Heinlex, les projets disposent d’un champ générique `extensions`. Core ne connaît ni les clés des modules ni leur métier. Le registre valide chaque extension avec `projectSchema` fourni par le module, et les applications composent ses éditeurs, introduction et pied de page facultatifs. Le document conserve son propre numéro de version d’extension.

Les projets 1.0.0 valides sont migrés explicitement en 1.1.0 avec une extension vide. Leurs expériences restent en soundscapes 1.0.0 : pas de réinterprétation silencieuse du contenu. La nouvelle version 1.1.0 du module est enregistrée à côté de l’ancienne ; `registry.available()` retourne seulement la version la plus récente pour les nouvelles expériences. Le catalogue des créations est extérieur au Core, dans `creations/`.

`apps/registry.ts` centralise la composition Studio/Player. Les dépendances workspace déclarées à la racine permettent aux sources partagées du catalogue et du registre de résoudre explicitement Core, SDK et soundscapes.
