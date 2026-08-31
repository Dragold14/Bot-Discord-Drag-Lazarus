# Patch V2 — Parcours de branche + renommage

Ce patch se pose par-dessus `goc-role-bot-modular-v1`.

## Nouveau panneau

Le terminal public contient maintenant :

1. **Accréditations majeures** : Fantassin (PHYS) / Partisan (PTOL)
2. **Parcours de branche** : bouton `OUVRIR MON PARCOURS`
   - le bot lit les rôles du joueur ;
   - il génère un menu privé PHYS et/ou PTOL ;
   - il n'affiche que le prochain grade réellement accessible ;
   - il masque les spécialisations déjà possédées.
3. **Autres accréditations** : R&D / Haut Commandement
4. **Demande particulière**

`Personnel extra divisionnaire` reste dans le catalogue pour compatibilité avec d'anciens dossiers, mais n'est plus proposé sur le panneau.

## Renommage automatique

Lorsqu'une accréditation de catégorie `major` est acceptée (y compris après réexamen), le bot tente :

- avec nom de code : `8808 | Spectre`
- sans nom de code : `8808 | C.Tuello`

Les formulaires principaux utilisent `Prénom / Nom` pour rendre cette règle non ambiguë.
Le renommage ne concerne pas les promotions, spécialisations ou demandes particulières.

Si Discord refuse le renommage, l'accréditation reste acceptée. Le bot écrit seulement un avertissement en console / réponse staff.

## Permission Discord nécessaire

Le rôle du bot doit avoir **Gérer les pseudos** et rester au-dessus des membres qu'il doit renommer.
Il doit également rester au-dessus de tous les rôles qu'il attribue.

## Fichiers ajoutés

- `src/ui/branch.js`
- `src/services/nickname.js`

## Fichiers modifiés

- `src/ui/panel.js`
- `src/catalog/groups.js`
- `src/catalog/major.js`
- `src/services/roles.js`
- `src/forms.js`
- `src/handlers/requestInteractions.js`
- `src/handlers/contestInteractions.js`

Aucune nouvelle variable `.env` n'est nécessaire pour le renommage.

## Après installation

Les anciens messages `/accreditations` déjà publiés ne changent pas tout seuls.
Relance le bot puis republie le terminal avec `/accreditations` pour voir la nouvelle mise en forme.

Ce patch ne modifie pas `index.js`, donc ton ajout GameDig / statut joueurs reste intact.
