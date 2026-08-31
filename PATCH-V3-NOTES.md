# Patch V3 — Autres accréditations

Ce patch part de la version modulaire V2.

## Nouveau menu « Autres accréditations »

Le menu contient maintenant :

- 🧪 Membre R&D
- ⭐ Membre Haut Commandement
- 🛠️ Rôle Staff
- 🔹 Demande particulière

Le bouton séparé « Demande particulière » est supprimé du panneau principal.

## Demande de rôle Staff

La demande Staff ouvre une modal avec :

- Prénom / Nom
- Matricule
- Nom de code (facultatif)
- Motivation / expérience

Si `HC_STAFF_ROLE_ID` est configuré, ce rôle traite les demandes Staff.
Sinon `STAFF_ROLE_ID` est utilisé comme rôle de validation.

Une acceptation attribue automatiquement `STAFF_ROLE_ID`.
Le renommage automatique n'est pas déclenché par une demande Staff.

## Installation

Copier le dossier `src` de ce patch par-dessus celui de la V2 et accepter le remplacement.
Aucune nouvelle variable `.env` n'est nécessaire.
