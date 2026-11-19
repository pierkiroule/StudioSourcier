# Sourciers Studio •° — V0.2

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

1. Nommer le parcours, ajouter des escales.
2. Choisir une écoute in situ, un paysage audio ou une écoute saisonnière.
3. Éditer les textes, les adresses HTTPS et les quatre saisons ; l’aperçu utilise le véritable Player.
4. Déplacer les escales avec les boutons monter/descendre. Supprimer avec confirmation.
5. Exporter le JSON pour conserver ou transmettre un projet. Importer pour le recharger.

Le dernier brouillon **valide** est conservé dans le navigateur. Un champ invalide reste éditable mais suspend la sauvegarde et l’export. Le stockage navigateur peut être effacé : exporter reste nécessaire. Un nouveau projet remplace le brouillon après confirmation. Changer le type d’une expérience initialise son nouveau contenu ; le contenu précédent n’est pas conservé.

Le fichier `examples/parcours-decouverte.json` propose les trois expériences sans média externe. Les contrôles audio apparaissent dès qu’une URL HTTPS est renseignée. Une URL valide ne garantit ni la disponibilité du son ni ses droits d’utilisation.

## Construire un parcours PWA

```sh
pnpm publish:local -- examples/parcours-decouverte.json https://votre-domaine.fr/parcours/decouverte/
```

Remplacer l’URL par la destination réelle avant diffusion. La commande valide le projet, construit les applications puis prépare `dist/published/<id>/` avec le Player, le JSON, le manifeste, le service worker et `qr.svg`. Elle ne met rien en ligne. Les sons distants ne sont pas inclus hors connexion.

## Documentation

- [Architecture et versions](docs/architecture.md)
- [Créer un module](docs/create-module.md)
- [Supabase, médias et o2switch](docs/integrations.md)
- [Vérifications et limites](docs/verification.md)

La V0.1 fonctionne sans compte, sans clé et sans serveur de données. Supabase et les médias privés R2 disposent de points d’intégration ; leur activation nécessite une configuration réelle.

## Heinlex 2027 : première création préchargée

Le Studio propose désormais **Heinlex 2027 •° — Oreillez-vous !** avec les 13 bornes du storyboard V0.4. Ouvrir sa carte dans **Mes créations** pour éditer textes, saisons, panneaux, notes d’équipe, médias, partenaires et formulaire de retour. **Parcourir le projet** prévisualise le brouillon complet.

Le parcours est également défini directement dans `creations/heinlex-2027/project.json` pour le faire évoluer par le code. Les modifications locales existantes sont préservées ; un bouton de rechargement confirmé permet de reprendre la nouvelle version du code. Voir [la documentation de la création](creations/heinlex-2027/README.md).

Les audios et logos restent à fournir. Le formulaire de retour est un aperçu : la collecte partagée n’est pas activée.
