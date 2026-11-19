# Vérification — Première création Heinlex, V0.2

Source : storyboard collectif V0.4 du 19 novembre 2026. Les contenus restent proposés, à relire et à valider. Le document partagé n’est pas modifié.

## Contrôles automatisés

- 31 tests : modèles, registre, persistance, expériences existantes et 11 scénarios Heinlex.
- Cohérence du catalogue : 13 escales uniques, répartition 6 + 6 + 1, 24 variantes textuelles, aucune URL audio inventée.
- Migration de projets 1.0.0 vers 1.1.0 et maintien des anciennes expériences en module 1.0.0.
- Ouverture au premier lancement, conservation d’un projet existant, modification et aperçu d’un vrai brouillon, rechargement du code après confirmation.
- Audio principal commun aux saisons ; textes propres à chaque saison ; notes internes absentes du rendu visiteur.
- Surprise sans autoplay, sans répétition immédiate et avec chaque piste éligible au premier tirage.
- Liens d’escales basés sur UUID, stables après réordonnancement ; retour à l’accueil si l’escale est supprimée.
- Retour facultatif : exclusivité du choix neutre, maintien possible de l’inconfort et absence d’envoi simulé.
- Contrôle TypeScript strict et builds des deux applications.

Le publisher est également exécuté sur le projet historique et sur Heinlex : validation, création du document, génération du Player, du manifeste, du service worker, des icônes et de 13 QR SVG distincts indexés par UUID. Les QR de test pointent vers example.org : ne pas les imprimer ; régénérer avec l’adresse réelle.

## Vérification d’interface

Chrome : ouverture des 13 bornes depuis la carte, aperçu d’une borne sur place, borne saisonnière avec choix Hiver, vue du parcours complet, navigation vers L’inattendu, ouverture du retour facultatif et choix exclusif. Vérification complémentaire du Player compilé et du Studio en largeur 390 px.

## Limites explicites

Aucun audio ni logo n’est fourni par le storyboard. Les emplacements éditables sont inclus et les médias manquants sont signalés. Les contenus ne portent aucune validation clinique implicite. Les descriptions accessibles, crédits, droits et implantations précises restent à renseigner avec les médias et l’équipe.

Le formulaire est un aperçu sans backend ; aucun retour n’est collecté. Supabase et R2 ne sont pas activés. Aucun changement de compte ou de protection Vercel n’est nécessaire à cette livraison. L’installation PWA et l’écoute réelle sur téléphone ne sont pas validées.

Les fichiers JSON source/exportés contiennent les notes de conception. Ces notes sont cachées du rendu visiteur, mais ne sont pas privées pour une personne ayant accès au fichier. Le brouillon de chaque navigateur n’est ni une modification du dépôt ni une synchronisation du Google Doc.
