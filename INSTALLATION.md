# inerWeb TT — Filière Énergétique
# Guide de réinstallation complète

## Version
- **Date** : 2026-03-13
- **Branche** : amelioration-v5.1
- **Dernier commit** : ca23b0b

## Contenu de cette sauvegarde

### Pages HTML (frontend)
| Fichier | Rôle |
|---------|------|
| index.html | Page d'accueil / portail d'entrée |
| inerweb_prof.html | Interface professeur (monolithe principal) |
| inerweb_tuteur.html | Interface tuteur entreprise |
| inerweb_eleve.html | Interface élève |
| inerweb_admin.html | Interface administration |
| aide.html | Page d'aide générale |
| aide_tuteur.html | Guide tuteur interactif |
| demo.html | Page de démonstration |
| inerweb_prof_v4.html | Ancienne version prof (archive) |

### Modules JavaScript (js/)
| Fichier | Rôle |
|---------|------|
| core.js | Utilitaires partagés (esc, toast, dateFR, safeParse, formatWA, etc.) |
| radar.js | Radars de compétences (Canvas, mini-radars dashboard) |
| jury.js | Gestion évaluateurs, commissions, désignation par épreuve |
| fusion-eval.js | Fusion non-destructive des évaluations entre collègues |
| rapport-pdf.js | Génération des rapports PDF |
| photos.js | Gestion des photos de stage |
| sync-queue.js | File de synchronisation offline-first |
| activites.js | Gestion des activités professionnelles |
| eval-tuteur.js | Évaluations côté tuteur |
| export-excel.js | Export vers Excel |
| export-mod.js | Module export (backup, restore, migration) |
| tp-manager.js | Gestion des travaux pratiques |
| exposition.js | Module exposition (oral) |
| tache-complexe.js | Module tâche complexe |
| historique.js | Historique des modifications |
| signatures.js | Gestion des signatures numériques |
| phases.js | Gestion des phases formatif/certificatif |
| impossibilites.js | Gestion des impossibilités d'évaluation |
| alertes.js | Système d'alertes |
| demo-guide.js | Guide interactif de démonstration |
| partenaires.js | Gestion entreprises partenaires |
| documents.js | Gestion documents partagés |
| journal-mod.js | Journal d'actions et backups |
| scanner.js | Scanner QR code |

### Tests
| Fichier | Rôle |
|---------|------|
| tests/smoke-test.html | 27 tests de fumée (ouvrir dans le navigateur) |

### Documentation
| Fichier | Rôle |
|---------|------|
| AUDIT_TECHNIQUE.md | Cartographie complète du projet |
| CHANGELOG.md | Journal des modifications v5.1 |
| RAPPORT_FINAL.md | Rapport de la mission d'amélioration |
| INSTALLATION.md | Ce fichier |

## Backend Google Apps Script

Le backend est un Google Apps Script hébergé sur Google Drive.

**URL de déploiement actuelle :**
```
https://script.google.com/macros/s/AKfycbzEbzLo57x0u0k2wjAzyLdZ42iVZdHdOwmPd5Ioe6fjApuSftuSckZ9svKpajbyjEuhVg/exec
```

**Pour accéder au code source (Code.gs) :**
1. Aller sur https://script.google.com/
2. Chercher le projet lié à cette URL de déploiement
3. Le fichier Code.gs contient toutes les fonctions serveur (doGet, doPost, saveValidation, addEleve, etc.)

**IMPORTANT** : Le fichier Code.gs n'est PAS inclus dans cette sauvegarde car il est hébergé sur Google Drive, pas dans le dépôt Git. Pour une sauvegarde complète, exporter aussi le Code.gs depuis l'éditeur Apps Script (Fichier → Télécharger).

## GitHub

**Dépôt** : https://github.com/frigorx/inerweb-tt-fe
**GitHub Pages** : https://frigorx.github.io/inerweb-tt-fe/

## Procédure de réinstallation

### Option 1 — Depuis cette sauvegarde
1. Copier tout le contenu de ce dossier dans un nouveau dossier
2. Ouvrir index.html dans un navigateur
3. Configurer l'URL API et la clé dans les paramètres

### Option 2 — Depuis GitHub
```bash
git clone https://github.com/frigorx/inerweb-tt-fe.git
cd inerweb-tt-fe
git checkout amelioration-v5.1
```

### Option 3 — Depuis GitHub Pages (en ligne)
Accéder directement à https://frigorx.github.io/inerweb-tt-fe/

## Configuration requise
- Navigateur moderne (Chrome, Firefox, Edge, Safari)
- Pas de serveur nécessaire (tout fonctionne en local via localStorage + IndexedDB)
- Connexion internet uniquement pour la synchronisation avec Google Apps Script

## Filières supportées
- **CAP IFCA** : Installateur en Froid et Conditionnement d'Air (EP2 + EP3)
- **Bac Pro MFER** : Métiers du Froid et des Énergies Renouvelables (E31 + E32 + E33)
- **2nde TNE** : Transition Numérique et Énergétique (modules CT)
