# Bot Discord — Demandes de rôles GOC

Bot Discord en Node.js + discord.js pour un serveur RP Coalition Mondiale Occulte.

## Fonctions

- Panneau `/accreditations`
- Fantassin Physique
- Opérateur Ptolémée
- Membre R&D
- Membre Haut Commandement
- Autre
- Formulaires Discord (modals)
- Salon privé de validation staff
- Boutons Accepter / Refuser
- Attribution automatique des rôles
- DM au demandeur après décision
- Rôle de validation spécifique possible pour le Haut Commandement

## 1. Installer Node.js

Installe Node.js 18 ou plus récent depuis le site officiel de Node.js.

Puis vérifie dans un terminal :

```bash
node -v
npm -v
```

## 2. Créer l'application Discord

1. Ouvre le Discord Developer Portal.
2. Crée une nouvelle application.
3. Va dans `Bot` et crée le bot si nécessaire.
4. Récupère/régénère le token et place-le dans `.env`.
5. Dans `OAuth2 > URL Generator`, coche `bot` et `applications.commands`.
6. Pour les permissions, donne au minimum :
   - View Channels
   - Send Messages
   - Embed Links
   - Manage Roles
7. Invite le bot sur ton serveur de test.

## 3. Préparer le projet

Copie `.env.example` en `.env` :

Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Windows CMD :

```cmd
copy .env.example .env
```

Linux/macOS :

```bash
cp .env.example .env
```

Ouvre ensuite `.env` et remplace tous les IDs.

Pour récupérer un ID Discord : active `Paramètres utilisateur > Avancés > Mode développeur`, puis clic droit sur le serveur, un salon ou un rôle > `Copier l'identifiant`.

## 4. Installer les dépendances

Dans le dossier du bot :

```bash
npm install
```

## 5. Lancer le bot

```bash
npm start
```

Tu dois voir :

```text
Connecté en tant que ...
Commande /accreditations enregistrée.
```

Dans Discord, utilise ensuite :

```text
/accreditations
```

Le panneau sera publié dans le salon où tu exécutes la commande.

## Important pour les rôles

Le rôle du bot doit être placé AU-DESSUS des rôles qu'il doit attribuer :

`Paramètres du serveur > Rôles`

Exemple :

```text
Bot Accréditations     <- plus haut
Haut Commandement
R&D
Opérateur Ptolémée
Fantassin Physique
```

## Logo et bannière

Pour afficher ton logo GOC et une bannière :

1. Envoie l'image dans un salon Discord ou utilise une URL HTTPS permanente.
2. Copie le lien de l'image.
3. Mets les liens dans `.env` :

```env
LOGO_URL=https://...
BANNER_URL=https://...
```

## Sécurité

Ne partage jamais le contenu de `.env`, en particulier `DISCORD_TOKEN`.
Si le token est exposé, régénère-le immédiatement dans le Developer Portal.
