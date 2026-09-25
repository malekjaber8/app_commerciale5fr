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
