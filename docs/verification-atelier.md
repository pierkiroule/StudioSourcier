# Vérification — atelier local V0.3

Vérification du 19 novembre 2026, après la V0.2 Heinlex. Cette livraison reste personnelle et locale : aucun backend ou accès collaboratif activé.

## Résultats

- Installation `pnpm install --frozen-lockfile` réussie.
- `pnpm check` : 43 tests passent, TypeScript strict et builds Studio/Player réussis.
- `pnpm format:check` : réussi.
- Génération CLI des PWA exemple et Heinlex : réussie, avec validation de l’extension transversale.
- Build du Studio : moteur Player intégré, manifeste, PNG 192/512 et service worker générés.

Les tests couvrent les trois expériences initiales et la surprise Heinlex, les modèles Core, les versions et le registre. Les nouveaux cas vérifient stockage IndexedDB après réouverture, médias binaires, modèles, versions figées, migration sans perte des anciens brouillons, sauvegarde/restauration ZIP, empreintes des médias, refus d’archives altérées, restauration atomique et collisions, SVG sans script, rendu et ordre des blocs, annulation/rétablissement, charte dans le vrai Player et export des médias/QR.

## Essais dans Chromium

- Ouverture du parcours Heinlex existant et de ses 13 escales.
- Changement de charte et de preset Ondographe avec effet sur l’aperçu.
- Application du code SVG généré.
- Téléchargement d’une sauvegarde réelle contenant deux projets, puis réimport et confirmation : statut « Sauvegarde restaurée et vérifiée ».
- Création d’une version figée, téléchargement de son ZIP Player ; contrôle des neuf fichiers, du JSON à 13 escales et de la charte/SVG appliqués.
- Déplacement du bloc Titre au clavier : l’ordre a changé dans la structure et dans l’aperçu.
- Capture de l’atelier avec la charte et les panneaux indépendants.

## Limites observées

Le build signale un chunk Studio d’environ 545 Ko (174 Ko gzip), sans échec. Zod émet des avertissements de commentaires d’annotation supprimés par Rollup, sans incidence sur les tests/builds.

L’installation et le comportement hors connexion sur un Android/iPhone réel ne sont pas certifiés par ces essais desktop. Les règles responsive et les panneaux téléphone sont implémentés ; le contrôle sur appareil cible reste nécessaire. La politique du navigateur de test interdit les DevTools ; aucune restriction n’a été désactivée.

La persistance accordée par le navigateur et son quota ne sont pas garantis. Sauvegarder régulièrement le ZIP dans ses fichiers. Les médias importés ne quittent pas l’appareil tant qu’un export n’est pas partagé. Un JSON seul ne remplace pas la sauvegarde complète.

Heinlex conserve les textes préparés ; ses véritables audios et logos restent à fournir. Le formulaire de retour ne collecte toujours pas de réponses. L’éditeur de code est limité au SVG autonome validé ; il n’exécute pas de code JavaScript/React arbitraire. La disposition est un système de blocs responsive, pas un éditeur de coordonnées libres.

La mise en ligne du Studio sur Vercel reste distincte de l’export des parcours. Le bouton de publication locale ne téléverse rien sur o2switch, R2 ou Supabase. La protection Vercel existante reste conservée.
