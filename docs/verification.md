# Vérification V0.1 — 19 novembre 2026

## Résultats

| Contrôle            | Résultat                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Installation pnpm   | Dépendances installées, lockfile versionné                                                       |
| Tests automatisés   | 20 tests réussis, 5 fichiers                                                                     |
| TypeScript strict   | `pnpm typecheck` réussi                                                                          |
| Build Studio        | Réussi                                                                                           |
| Build Player        | Réussi                                                                                           |
| Publisher statique  | Exemple validé ; Player, projet, manifeste, icônes PNG 192/512, service worker et QR SVG générés |
| Interface desktop   | Création, édition et aperçu des escales observés dans Chrome                                     |
| Interface 390 px    | Mise en page dans une iframe de 390 px, ouverture de l’aperçu vérifiée                           |
| Écoute in situ      | Invitation et durée visibles dans le Player commun                                               |
| Audio               | Champs, transcription et lecteur vérifiés ; URL non HTTPS refusée sans crash                     |
| Saisons             | Édition des contenus et changement de saison observés ; quatre saisons couvertes automatiquement |
| Player compilé      | Ouverture du JSON généré, navigation entre escales et changement de saison vérifiés dans Chrome  |
| Export navigateur   | Téléchargement JSON déclenché et confirmation visible                                            |
| Import/restauration | Tests fonctionnels automatisés réussis, restauration observée après rechargement                 |

`pnpm check` exécute les tests puis le contrôle TypeScript et les deux builds. La CI reprend ces commandes et teste la génération statique sur le projet d’exemple. Les tests fonctionnels React utilisent Testing Library et jsdom ; les vérifications Chrome ci-dessus sont manuelles et ne constituent pas une suite Playwright automatisée.

Les builds émettent des avertissements Rollup sur des annotations de commentaires internes à Zod ; ils terminent sans erreur. Aucune erreur applicative n’a été observée dans la console du Player ; des messages propres à l’extension du navigateur de test étaient présents.

## Limites et validations externes restantes

- Supabase : adaptateur, configuration optionnelle et migration RLS préparés. Aucun serveur réel ni authentification connectée ; migration et isolation multi-utilisateurs à tester avant activation.
- R2 : abstraction et point de résolution autorisée préparés. Pas d’upload, de serveur de signature, de renouvellement de lien ou de sélecteur R2 dans l’éditeur.
- Audio : association des URL et contrôles testés. Pas de fichier sonore réel fourni ; aucune écoute réelle ni disponibilité d’un hébergeur média validée.
- PWA : fichiers générés et Player compilé testés. Installation système et véritable relance hors connexion sur Android/iOS non validées. Aucun son distant n’est disponible hors ligne.
- o2switch : procédure de déploiement documentée ; aucun transfert ni domaine réel configuré.
- Responsive : largeur simulée par iframe ; pas de test sur téléphone physique ou Safari.
- Données : un seul brouillon local, pas de liste de projets, de collaboration ni de synchronisation cloud. Export JSON nécessaire pour conserver plusieurs projets.
- Une escale contient une expérience. Changer sa forme remplace son contenu, avec avertissement dans l’interface. Escales sans expérience et sons vides sont acceptés pour permettre un travail progressif.
- Modules installés par dépendances et compilation, sans installation à chaud. Versions inconnues refusées ; aucune migration historique nécessaire pour cette première version.
- Les relations génériques sont modélisées et validées, mais leur éditeur et leur navigation spécifique ne font pas partie de ce jalon.

Aucun jalon suivant n’a été entrepris. Aucun secret n’est inclus et aucun service de production n’a été configuré.
