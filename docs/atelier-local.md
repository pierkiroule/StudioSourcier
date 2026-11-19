# Atelier visuel local — V0.3

## Trois espaces

**Créations** regroupe les brouillons, Heinlex préparé dans le code, les fichiers et les modèles. Ouvrir une autre création conserve la précédente. Dupliquer crée un nouvel identifiant. Recharger une création préparée demande confirmation et conserve une version de reprise.

**Atelier** présente la structure à gauche, le vrai Player au centre et les réglages à droite. Sur téléphone, les boutons Structure / Aperçu / Réglages affichent un panneau à la fois. Sélectionner un élément dans l’aperçu ouvre son outil. Les poignées déplacent escales et blocs à la souris, au toucher ou au clavier (Espace, flèches, Espace). Monter / Descendre restent disponibles pour les escales.

**Publier** fige une version indépendante. Le brouillon peut continuer à évoluer. Exporter cette version produit un dossier ZIP contenant Player construit, projet, médias locaux utilisés, manifeste et service worker. Une adresse HTTPS réelle terminée par `/` permet aussi de générer les QR codes d’accueil et de chaque escale. Décompresser puis transférer le contenu sur un hébergement HTTPS : le ZIP n’est pas déployé automatiquement par ce bouton.

## Personnalisation

- Charte globale : palettes, couleurs, police système sans serif ou serif, arrondis. Aucun téléchargement de police n’est nécessaire au fonctionnement.
- Ondographe : presets, lignes, rythme, amplitude, épaisseur, pause ; réglages globaux ou propres à une escale.
- Code SVG : source autonome validée, animations déclaratives autorisées. Pas de JavaScript, HTML embarqué ni ressources externes. Le SVG est affiché comme image isolée ; ce n’est pas un éditeur de code React/CSS arbitraire. La pause et la préférence mouvement réduit suppriment ses animations.
- Blocs : ordre, visibilité, textes et images supplémentaires, largeur, alignement et espacement. Les réglages sont enregistrés dans le projet et lus par le même Player.
- Modèles réutilisables : chartes, Ondographes et escales avec leurs blocs. Annuler / Rétablir garde 60 états en mémoire ; les frappes proches sont regroupées. Les champs conservent aussi leur annulation native.

## Sauvegarde sur téléphone

IndexedDB conserve plusieurs projets, les fichiers binaires, les modèles et les versions. Le statut « Enregistré sur cet appareil » apparaît seulement après validation et réussite de l’écriture. Une saisie invalide reste éditable, mais la dernière version valide reste sauvegardée. Une erreur de quota est affichée ; exporter une copie avant de quitter.

« Sauvegarder un fichier » télécharge un ZIP complet dans le dossier de téléchargements choisi par le navigateur. Il contient les projets, médias importés, chartes, SVG **appliqués**, modèles, versions figées et points de reprise. La source SVG en cours de saisie doit être validée ou abandonnée ; elle n’est pas un contenu appliqué. La restauration valide les schémas, références et empreintes SHA-256 avant toute écriture, puis fusionne les données dans une transaction. Les brouillons remplacés ont une copie de reprise. Aucun fichier n’est envoyé à un serveur.

Un JSON conserve les données et adresses, sans les fichiers audio/images. Les références locales `asset:<uuid>` nécessitent les fichiers présents dans l’atelier ; préférer le ZIP complet pour changer d’appareil. Les médias distants restent des liens : leur contenu n’est pas téléchargé dans la sauvegarde.

Limites de cette version : 50 Mo par fichier, 200 Mo de médias par sauvegarde, 200 projets/médias/modèles et 1 000 versions par archive. L’export ZIP se fait en mémoire. Le quota réel varie selon le navigateur et l’appareil. Les versions automatiques sont espacées d’au moins une minute, environ dix par projet ; les points manuels et versions figées sont conservés. Les médias ne sont pas supprimés automatiquement car des versions anciennes peuvent les utiliser.

Le stockage appartient au navigateur et à l’origine exacte du site. Il n’est pas synchronisé entre téléphone et ordinateur, ni entre deux domaines Vercel. Effacer les données du site peut l’effacer. Le bouton « Protéger le stockage » demande la persistance au navigateur, sans la garantir. Conserver régulièrement le ZIP dans ses fichiers constitue la copie indépendante. Les anciennes sauvegardes localStorage V0.1/V0.2 sont migrées sans effacer les originaux.

## Installation et hors connexion

`pnpm build` construit d’abord le Player et l’intègre au Studio, puis génère le manifeste, les icônes PNG 192/512 et le service worker du Studio. Ouvrir le site en HTTPS, puis utiliser l’installation proposée par le navigateur. Après un premier chargement complet, le service worker peut conserver le shell du Studio et le moteur d’export ; les créations et médias restent dans IndexedDB. Les polices externes ont une police système de repli. Une protection de connexion de l’hébergeur peut limiter le premier chargement/l’installation ; elle n’est pas désactivée par le Studio.

Une mise à jour du service worker attend la fermeture des anciennes fenêtres. Fermer puis rouvrir le Studio après un déploiement si nécessaire. Les audios distants et les médias du Player publié ne sont pas mis dans le cache PWA. L’installation réelle Android/iOS et l’éviction du stockage doivent être contrôlées sur les appareils cibles.

## Contrat d’extension

`packages/studio-tools` contient les schémas `appearance@1.0.0`, contextes de rendu, modèles de blocs et validation SVG. Le Core reste indépendant. Le registre valide les extensions transversales avec `registerProjectExtension`. Une version inconnue est refusée ; les projets sans `appearance` utilisent les défauts.

Le SDK ajoute `PlayerBlocks` facultatif à une expérience. Le module produit des blocs `{id,label,content}` ; le Player applique ordre, visibilité et sélection, et ajoute titres/textes/images. Les modules existants avec seulement `Player` restent utilisables. Les identifiants sémantiques actuels sont `animation`, `invitation`, `seasons`, `audio`, `everyday`. La bibliothèque de blocs est volontairement bornée dans cette version. Pour un nouveau type, étendre le schéma versionné et son rendu, avec tests et migration explicite si nécessaire.

Aucun connecteur Supabase ou R2 n’est nécessaire au fonctionnement local. `asset:<uuid>` est une référence logique résolue par le contexte de médias ; l’export copie les fichiers et produit `media.json`. Les secrets R2 restent côté serveur lorsqu’un adaptateur distant sera activé.
