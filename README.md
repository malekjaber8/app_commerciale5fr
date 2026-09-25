# Espace Commercial — Les Cinq Freres

Application separee du site officiel (React + Vite + TypeScript + Tailwind).

## Commandes
- `npm install`          installer les dependances
- `npm run dev`          lancer en local
- `npm run build`        construire (dossier dist)
- `node scripts/sync-catalogue.mjs [chemin-site]`  copier le catalogue du site (lecture seule)

## Deploiement
Chaque push sur `main` deploie automatiquement sur GitHub Pages (workflow dans .github/workflows).
Reglage a faire une fois : GitHub > Settings > Pages > Source = "GitHub Actions".

## Application bureau (admin)
- `npm run desktop`          lancer l'app admin en local (Electron)
- `npm run package:desktop`  produire le .exe dans release/Admin-CinqFreres-win32-x64/
L'interface admin n'est incluse que dans ce build (VITE_DESKTOP=1) : elle n'est jamais publiee sur GitHub Pages.
Note : dans certains terminaux (VS Code) la variable ELECTRON_RUN_AS_NODE=1 empeche Electron de demarrer ; la supprimer avant de lancer.

## Firestore
Coller le contenu de firestore.rules dans Firebase > Firestore > Regles, puis Publier (a refaire a chaque changement du fichier).
