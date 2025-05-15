# Visualisation interactive des logements sociaux par département

Ce projet est une application interactive de datavisualisation en **D3.js v4**, représentant les **logements sociaux par département français** sous forme de **bulles**. Chaque bulle correspond à un département, dont la taille est proportionnelle au nombre de logements sociaux.

## 🔍 Fonctionnalités

- **Visualisation par regroupement :**
  - **Vue générale** : toutes les bulles rassemblées au centre.
  - **Par centre géographique (carte)** : les bulles sont positionnées selon la projection géographique du centre de chaque département.
  - **Par région** : les bulles sont regroupées horizontalement selon leur région.
  - **Par nombre de logements** : représentation selon un axe Y logarithmique du nombre de logements sociaux.

- **Interactions utilisateur :**
  - **Survol d'une bulle** : affichage du nom du département, code et nombre de logements sociaux.
  - **Légende dynamique des régions** : s’affiche avec les couleurs correspondantes.
  - **Transitions fluides** entre les vues.
  - **Responsive** : la visualisation s’adapte à différentes tailles d’écran.

## 📁 Structure du projet

```bash
.
├── index.html            # Page principale
├── scriptJ.js            # Code D3.js principal
├── style.css             # Feuilles de style
├── data_logt_dep.csv     # Données par département (logements sociaux)
└── region-names.json     # Mapping des codes régions vers les noms