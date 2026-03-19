# 🌍 GéoQuiz

> Quiz de géographie interactif — pays, drapeaux et capitales du monde

[![Vercel](https://img.shields.io/badge/déployé%20sur-Vercel-black?logo=vercel)](https://geoquizz.vercel.app)
[![Firebase](https://img.shields.io/badge/base%20de%20données-Firebase-orange?logo=firebase)](https://firebase.google.com)
[![Leaflet](https://img.shields.io/badge/carte-Leaflet%201.9-green?logo=leaflet)](https://leafletjs.com)
![Licence](https://img.shields.io/badge/licence-MIT-blue)

---

## ✨ Fonctionnalités

- **🚩 Quiz drapeaux** — Reconnaître un drapeau parmi 4 propositions
- **🗺️ Quiz capitales** — Associer un pays à sa capitale (QCM ou saisie libre)
- **✍️ Quiz écriture** — Taper le nom du pays à partir de son drapeau
- **🌐 Carte mondiale** — Retrouver et nommer les 246 pays sur une carte interactive Leaflet
- **🏆 Classement** — Scores en temps réel via Firebase Realtime Database
- **🔑 Panneau admin** — Gestion des classes, export/import des scores
- **🌙 Dark / Light mode** — Thème persistant via localStorage
- **📱 Responsive** — Compatible mobile, tablette et vidéoprojecteur

---

## 🚀 Démo

**[geoquizz.vercel.app](https://geoquizz.vercel.app)**

---

## 🏗️ Stack technique

| Technologie | Usage |
|---|---|
| HTML / CSS / JS vanilla | Frontend |
| [Leaflet 1.9](https://leafletjs.com) | Carte mondiale interactive |
| [Firebase Realtime DB](https://firebase.google.com) | Scores & classes en temps réel |
| [RestCountries API](https://restcountries.com) | Données pays (noms, drapeaux, capitales) |
| [FlagCDN](https://flagcdn.com) | Drapeaux haute résolution |
| [Vercel](https://vercel.com) | Hébergement & déploiement continu |

---

## 📁 Structure du projet

```
geoquiz/
├── index.html          # Application principale (SPA)
├── og-image.png        # Image Open Graph pour les partages
├── sitemap.xml         # Sitemap pour le référencement
└── robots.txt          # Directives pour les crawlers
```

---

## ⚙️ Installation locale

```bash
# Cloner le dépôt
git clone https://github.com/LucasGest/geoquizz.git
cd geoquizz

# Ouvrir avec un serveur local (ex: VS Code Live Server)
# ou avec Python :
python3 -m http.server 5500
```

Ouvrir ensuite [http://localhost:5500](http://localhost:5500) dans le navigateur.

> ⚠️ Un serveur local est nécessaire (pas d'ouverture directe du fichier HTML) à cause des requêtes Firebase et des APIs externes.

---

## 🔧 Configuration Firebase

Le projet utilise Firebase Realtime Database. La configuration est intégrée dans `index.html` :

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "geoquiz-676ac.firebaseapp.com",
  databaseURL: "https://geoquiz-676ac-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "geoquiz-676ac",
  // ...
};
```

### Structure de la base de données

```
/
├── scores/
│   └── {id}/
│       ├── nom       — Prénom de l'élève
│       ├── classe    — Classe sélectionnée
│       ├── mode      — Mode de quiz (flags, capitals, etc.)
│       ├── score     — Score obtenu
│       ├── total     — Nombre de questions
│       └── date      — Timestamp
└── classes/
    └── {id}          — Nom de la classe (ex: "6ème A")
```

---

## 🌍 Données géographiques

- **246 pays** chargés depuis [RestCountries v3](https://restcountries.com/v3.1/all)
- Noms traduits en français via une table manuelle (`FR_NAMES`) + l'API
- Capitales traduites en français via une table dédiée (`FR_CAPITALS`)
- Aliases multiples acceptés (ex : "Tchéquie", "Birmanie", "Angleterre"…)
- GeoJSON mondial depuis [johan/world.geo.json](https://github.com/johan/world.geo.json)

---

## 📸 Aperçu

| Mode Quiz | Carte interactive |
|:---------:|:-----------------:|
| Quiz drapeaux, capitales et écriture | Carte Leaflet avec révélation progressive |

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Pour proposer une amélioration :

1. Fork le projet
2. Crée une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m 'feat: ajout de ...'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvre une Pull Request

---

## 📄 Licence

Distribué sous licence **MIT**. Voir `LICENSE` pour plus d'informations.

---

<div align="center">
  Fait avec ❤️ pour les cours de géographie
</div>
