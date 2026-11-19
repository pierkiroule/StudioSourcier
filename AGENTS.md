# Règles de développement — Sourciers Studio •°

## Périmètre et architecture

- Préserver le monorepo pnpm, React, Vite et TypeScript strict. Aucun `any` explicite.
- Core contient uniquement les projets, escales, relations et interfaces de persistance. Il n’importe aucun module métier ni composant React.
- Les modules dépendent du SDK. Chaque module expose ses schémas, défauts, éditeurs et lecteurs, sans modifier Core.
- Charger les modules explicitement dans les points de composition Studio et Player. Aucun chargement de JavaScript distant arbitraire.
- Le Player utilisé en prévisualisation doit rester celui de l’application publiée.
- Utiliser les composants et tokens du design-system. Fond clair, contrastes lisibles, clavier et mouvement réduit.

## Données et sécurité

- Parser les données externes avec Zod et vérifier les contenus via le registre avant persistance/publication.
- Ne pas accepter silencieusement une version inconnue. Une migration est pure, explicite et testée. Ne jamais écraser le fichier source importé.
- Ne pas coder de lieu, de client, de domaine de production ou de secret dans le moteur.
- Clés R2, secrets Supabase et service_role : uniquement côté serveur. Les variables VITE sont publiques.
- Préserver RLS et les contrôles d’autorisation côté serveur. Ne pas mettre d’audio privé dans le cache PWA.
- Ne jamais déployer des identifiants fictifs ou une configuration .env.example.

## Vérification et livraison

- Exécuter `pnpm check` après modification de comportement ou de schéma.
- Tester modèles, versions, registre et parcours des expériences affectées.
- Vérifier l’interface et la génération statique après un changement Player/publisher.
- Documenter chaque ajout de module et toute limite observée.
- Ne pas ouvrir de jalon suivant tant que la V0.1 n’est pas vérifiée.
- Ne pas écraser l’historique Git distant. Livrer sur une branche avec une PR quand le dépôt cible est identifié.

## Atelier local

- Garder les fichiers binaires dans IndexedDB et les références logiques dans les projets. Ne jamais sérialiser des URL blob temporaires.
- Valider une archive complète avant sa restauration atomique ; préserver les brouillons remplacés.
- Une version publiée locale est indépendante du brouillon. Toute personnalisation doit être visible dans le Player exporté.
- SVG : liste de formes/animations autorisées, validation puis image isolée ; jamais de JavaScript ou de HTML importé exécuté.
- Mettre à jour les tests de restauration et le contrat versionné lors d’une évolution des outils.
