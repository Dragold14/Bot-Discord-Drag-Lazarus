# GOC Role Bot — refonte modulaire

Cette version remplace le gros `index.js` par plusieurs petits modules, sans ajouter de nouvelle dépendance npm.
Elle conserve le flux actuel : formulaire joueur → dossier staff → accepter/refuser → DM → réexamen → fil staff privé → réponse staff via modal.

## Nouveau fonctionnement

Le panneau `/accreditations` contient plusieurs menus distincts :

1. Accréditations majeures
2. Grades PHYS
3. Grades PTOL
4. Spécialisations PHYS
5. Spécialisations PTOL
6. Demande particulière

Le joueur ne tape aucune commande. Il sélectionne une option et le bot vérifie immédiatement ses rôles avant d'ouvrir la modal.

### Accréditations majeures

- Fantassin attribue automatiquement : séparateur Rang PHYS + Militaire du Rang PHYS + séparateur Division PHYS + Fantassin + séparateur Spécialisation PHYS.
- Partisan fait la même chose pour PTOL.
- R&D / Extra / HC peuvent aussi attribuer leur séparateur facultatif si son ID est renseigné.

### Promotions

Les promotions sont séquentielles :

- MDR → Sous-Officier
- Sous-Officier → Officier
- Officier → Co-Gérant
- Co-Gérant → Gérant

Lorsqu'une promotion est validée, l'ancien grade de la même branche est retiré et le nouveau est ajouté.

### Spécialisations

- Une spécialisation PHYS exige Fantassin.
- Une spécialisation PTOL exige Partisan.
- Les spécialisations s'additionnent : elles ne se remplacent pas entre elles.

## Installation dans ton repo actuel

1. Fais une copie de sauvegarde de ton `index.js` actuel.
2. Copie le nouveau `index.js` et le dossier `src/` à la racine du repo.
3. Garde ton `package.json` et ton `package-lock.json` actuels : aucune nouvelle dépendance n'est nécessaire.
4. Ajoute les nouvelles variables de `.env.example` dans Railway > Variables.
5. Vérifie que le rôle Discord du bot est AU-DESSUS de tous les rôles qu'il doit ajouter ou retirer.
6. Push sur GitHub. Railway redéploiera automatiquement.
7. Une fois le bot connecté, relance `/accreditations` pour publier le nouveau panneau. Supprime manuellement l'ancien panneau.

## Railway / contestations.json

Le code utilise automatiquement `RAILWAY_VOLUME_MOUNT_PATH` quand ton Volume Railway est présent. Sinon il utilise la racine du projet en local.

Les anciennes clés de demandes `physique`, `ptolemee`, `rd`, `hc`, `autre` ont été conservées pour limiter les problèmes avec ton `contestations.json` existant.

## Important avant le premier test

Si une option n'a pas tous ses IDs indispensables, elle est cachée du panneau et un warning apparaît dans les logs Railway :

`[CONFIG] Demande désactivée (IDs de rôles incomplets) : ...`

C'est volontaire : le bot refuse d'afficher une accréditation qu'il ne pourrait pas appliquer correctement.

## Test conseillé

1. Publier le panneau.
2. Demander Fantassin avec un compte de test sans rôles.
3. Accepter côté staff.
4. Vérifier les 5 rôles attribués automatiquement.
5. Demander Sous-Officier PHYS.
6. Vérifier que la modal s'ouvre uniquement si MDR PHYS est présent.
7. Accepter et vérifier que MDR est retiré, Sous-Officier ajouté.
8. Refuser une spécialisation puis tester le réexamen sans redémarrer le bot.
9. Répondre via la modal staff et vérifier que le joueur reçoit uniquement un message cité `> ...`.
