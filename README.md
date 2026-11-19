# Sourciers Studio •° — V0.3

Atelier local de parcours numériques, extensible par modules. Aucun lieu ni client n’est codé dans le moteur.

## Démarrer

Node 24 LTS et pnpm 11.25.0.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir l’URL affichée par Vite. `pnpm dev:player` lance le Player séparément ; il accepte un projet JSON depuis son écran d’ouverture.

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm check
```

## Utilisation

1. Ouvrir une création ou créer un projet dans **Créations**.
2. Composer les escales et leurs blocs dans **Atelier** : aperçu sélectionnable, charte, Ondographe, textes et médias.
3. Réordonner au toucher, à la souris ou au clavier. Dupliquer, utiliser des modèles, annuler/rétablir.
4. La sauvegarde automatique garde plusieurs projets dans IndexedDB. Télécharger aussi une **sauvegarde complète ZIP** pour conserver une copie indépendante sur le téléphone.
5. Dans **Publier**, figer une version puis exporter le Player avec ses médias locaux et ses QR codes.

Voir [le guide de l’atelier local](docs/atelier-local.md) pour l’installation PWA, la restauration, le code SVG et les limites. Aucun compte ni Supabase n’est requis. Le stockage reste propre à cet appareil et à ce domaine ; conserver les ZIP exportés. Une saisie invalide suspend l’enregistrement et l’export sans effacer la dernière version valide. Changer de type initialise le contenu après confirmation ; Annuler permet de revenir en arrière.

Le fichier `examples/parcours-decouverte.json` propose les trois expériences sans média externe. Les contrôles audio apparaissent dès qu’une URL HTTPS est renseignée. Une URL valide ne garantit ni la disponibilité du son ni ses droits d’utilisation.

## Construire un parcours PWA

```sh
pnpm publish:local -- examples/parcours-decouverte.json https://votre-domaine.fr/parcours/decouverte/
```

Remplacer l’URL par la destination réelle avant diffusion. La commande valide le projet, construit les applications puis prépare `dist/published/<id>/` avec le Player, le JSON, le manifeste, le service worker et `qr.svg`. Elle ne met rien en ligne. Les sons distants ne sont pas inclus hors connexion.

## Documentation

- [Atelier visuel et sauvegarde locale](docs/atelier-local.md)
- [Architecture et versions](docs/architecture.md)
- [Créer un module](docs/create-module.md)
- [Supabase, médias et o2switch](docs/integrations.md)
- [Vérifications et limites](docs/verification.md)

La V0.1 fonctionne sans compte, sans clé et sans serveur de données. Supabase et les médias privés R2 disposent de points d’intégration ; leur activation nécessite une configuration réelle.

## Heinlex 2027 : première création préchargée

Le Studio propose désormais **Heinlex 2027 •° — Oreillez-vous !** avec les 13 bornes du storyboard V0.4. Ouvrir sa carte dans **Créations** pour éditer textes, saisons, panneaux, notes d’équipe, médias, partenaires et formulaire de retour. **Prévisualiser** prévisualise le brouillon complet.

Le parcours est également défini directement dans `creations/heinlex-2027/project.json` pour le faire évoluer par le code. Les modifications locales existantes sont préservées ; un bouton de rechargement confirmé permet de reprendre la nouvelle version du code. Voir [la documentation de la création](creations/heinlex-2027/README.md).

Les audios et logos restent à fournir. Le formulaire de retour est un aperçu : la collecte partagée n’est pas activée.
