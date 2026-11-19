# Heinlex 2027 •° — Première création du Studio

Source éditoriale : [Cadrage et storyboard éducatif et thérapeutique, base collective V0.4](https://docs.google.com/document/d/1T5MnBA-2Nz-qRZZz0-SIESgw0aBDEVtH5CCIWr1jaSw), lu dans sa version du 19 novembre 2026. Les textes restent des propositions à valider avec l’équipe. Le Google Doc n’est pas modifié ni synchronisé automatiquement.

`project.json` est la source de cette création. Les contenus ne sont codés ni dans Core ni dans le Player. `creations/index.ts` déclare le catalogue des créations préparées. Ajouter un autre parcours revient à créer un nouveau document JSON validé et une entrée de catalogue.

## Contenu déjà intégré

| Bornes | Expériences                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1–6    | Les sons lointains ; Le presque silence ; Les voix proches ; Le vent invisible ; Les rythmes du lieu ; Le paysage entier            |
| 7–12   | Les voix des oiseaux ; Le souffle des arbres ; Le monde minuscule ; Les éléments ; Les heures du vivant ; Les métamorphoses         |
| 13     | L’inattendu : collection sonore et découverte sans lecture automatique ni répétition immédiate si plusieurs pistes sont disponibles |

Chaque borne conserve l’invitation de l’application, celle du panneau, la phrase sous le QR, l’ouverture vers le quotidien, les notes de conception et sa variation d’Ondographe. Les six bornes saisonnières contiennent les 24 textes du storyboard, une adresse audio principale et quatre variantes audio facultatives. Les bornes sur place n’affichent ni minuteur ni durée.

Accueil, intention, accessibilité, statut éditorial, espaces partenaires et textes du retour facultatif sont inclus et modifiables dans le Studio. Le formulaire respecte le choix exclusif « Je n’en retiens rien de particulier » tout en permettant de conserver le tag d’inconfort.

## Modifier par le code

1. Modifier directement `project.json` avec les schémas du module soundscapes 1.1.0.
2. Conserver l’ID du projet et les 13 IDs d’escales : ils sont les cibles des liens permanents.
3. Exécuter `pnpm check`, puis vérifier le Studio et le Player.
4. À la première visite sans brouillon, Heinlex est proposé automatiquement. Si un brouillon existe, il reste conservé. La carte **Mes créations** ouvre Heinlex sans effacer les autres projets.
5. Après une mise à jour par le code, **Recharger la version du code** permet de repartir du document livré. Une confirmation avertit du remplacement des modifications locales ; exporter avant ce remplacement.

L’édition dans le Studio est enregistrée sur le navigateur et exportable en JSON ; elle n’écrit pas sur GitHub ni dans le Google Doc. Le bouton **Parcourir le projet** lit le brouillon courant. **Voir le parcours préparé** ouvre la version du code, pas un brouillon privé de ce navigateur.

## Publier et tester

```sh
pnpm publish:local -- creations/heinlex-2027/project.json https://votre-domaine.fr/heinlex/
```

Le dossier généré contient le Player, un QR d’accueil et un dossier `qr/` avec 13 QR SVG et leur index. Chaque URL de borne porte `#escale=<id>` : elle reste stable lors d’un simple réordonnancement. Tester les adresses et les QR sur le domaine réel avant toute impression. L’URL de la commande est la destination finale, à remplacer réellement.

Le Studio dispose aussi d’une lecture intégrée à `?creation=heinlex-2027&view=player`, avec les mêmes liens d’escales. Aucun enregistrement audio ne se lance automatiquement.

## À compléter avant une ouverture publique finale

- Les six créations sonores principales, les pistes de L’inattendu, leurs descriptions, leurs crédits et leurs droits ne sont pas fournis dans le storyboard. Aucun fichier ni lien fictif n’a été ajouté. Les lecteurs signalent leur préparation.
- Les partenaires disposent d’emplacements éditables ; aucun logo ni partenaire n’est inventé.
- Le retour participant est un **aperçu sans envoi**. Aucune réponse ne quitte le navigateur et aucun message de réception ne simule une collecte. Un backend partagé et les modalités de conservation restent à définir.
- Les notes « équipe » ne sont pas rendues dans le Player, mais restent dans les JSON et le dépôt. Elles ne constituent pas un espace de données confidentielles.
- La réaction de l’Ondographe suit l’état de lecture ; elle ne mesure pas le signal acoustique. Aucun microphone n’est utilisé.
