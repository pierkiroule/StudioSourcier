# Intégrations préparées

## Supabase

L’adaptateur `apps/studio/src/supabase.ts` implémente ProjectRepository, vérifie l’utilisateur connecté et propage les erreurs. `configuredSupabase()` retourne null si aucune configuration n’est fournie ; le Studio local n’appelle pas Supabase.

Pour une intégration réelle : créer le projet Supabase, appliquer la migration avec la CLI officielle, configurer Auth, fournir VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY, puis brancher l’adaptateur dans le flux d’authentification. Le .env.example reste vide volontairement. Ne jamais exposer une clé secret/service_role dans Vite.

Les politiques RLS limitent SELECT/INSERT/UPDATE/DELETE au propriétaire authentifié. Tester avec deux utilisateurs et un visiteur anonyme avant activation. Le SQL contrôle la structure de base ; Zod et le registre contrôlent l’intégralité du contenu applicatif. Une fonction de publication serveur devra revalider les données métier si des clients non fiables peuvent écrire directement.

Pas de connexion utilisateur, UI cloud ni migration appliquée à un serveur réel dans cette livraison.

Source : https://supabase.com/docs/guides/database/postgres/row-level-security

## Cloudflare R2

MediaResource distingue une URL HTTPS publique et une clé d’objet R2. SecureMediaResolver injecte un service d’autorisation qui transforme une clé en URL HTTPS temporaire. Aucun compte R2 ni secret n’est requis pour l’utiliser avec un service de test.

Le chemin réel prévu : le navigateur envoie l’identifiant média à une Edge Function ou un Worker ; ce serveur authentifie le visiteur, contrôle son droit d’accès au parcours et à l’objet, puis crée une URL signée courte. Les identifiants S3/R2 restent dans les secrets serveur. Configurer CORS pour les domaines réellement déployés. Une URL signée est un jeton porteur partageable jusqu’à expiration et n’empêche pas l’enregistrement d’un son.

La V0.1 édite uniquement des URL publiques durables. Le modèle de contenu soundscapes n’expose pas encore le sélecteur de ressources R2. Ne pas enregistrer des liens signés éphémères dans les JSON publiés. L’upload, le backend de signature, le renouvellement des liens et le contrôle des abonnements restent à implémenter lors du jalon médias sécurisé.

Sources :

- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://developers.cloudflare.com/r2/buckets/cors/

## o2switch

Les builds Vite utilisent `base: './'`. Copier le contenu de `apps/studio/dist/` dans le répertoire web du Studio. Pour un parcours, lancer publish:local avec sa future URL HTTPS et transférer le contenu de `dist/published/<id>/` vers le répertoire correspondant. Chaque parcours dispose ainsi de son scope PWA, de son document et de son QR. Le Player utilise des boutons, sans routes history : aucune réécriture SPA n’est requise.

Activer un certificat HTTPS valide avant utilisation. Vérifier les types MIME JavaScript, JSON, SVG et webmanifest. Servir sw.js et project.json avec revalidation (Cache-Control: no-cache) ; garder les assets hashés immuables. Après publication, scanner qr.svg, tester le Player puis une relance hors ligne après une première visite en ligne.

Aucun accès FTP/SSH, domaine ou secret fictif n’est inclus. Aucun déploiement o2switch n’a été effectué.

## Hors connexion

Le publisher inclut un manifeste, une icône et un service worker pour le shell, les assets et le document. Le cache est propre au projet et versionné par updatedAt. Il ne met en cache ni les sons distants ni les médias privés. Les polices externes sont facultatives et disposent de polices système de repli. La première visite exige le réseau. L’installation varie selon le navigateur ; elle doit être vérifiée sur les appareils visés.
