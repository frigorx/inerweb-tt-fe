# Backend INERWEB — Google Apps Script

## Backends actifs

### 1. Backend Édu v4 (Code_edu_v2.4.0.gs)
- **URL** : https://script.google.com/macros/s/AKfycbwpxKj7PKtoNjo7i4jCpHfAm2pJA4krUXWDrslVEaruEfrEDmdwq6tsV3mvLjO796C6/exec
- **API Key** : inerWeb2026fh
- **Sheet ID** : 1RTJ9jFhQtHgfXBUqMgj01wH-8MNGMGjDSjcFjkYjleA
- **Version** : 2.4.0
- **Actions GET** : ping, getSeances, getSeancesSemaine, getEvents, getEleves, getReferentiel
- **Actions POST** : pushEvents, enrichirTexteED, askCopilot, importEcoleDirecte

### 2. Backend PROG+ (non inclus dans le dépôt)
- **URL** : https://script.google.com/macros/s/AKfycbzEbzLo57x0u0k2wjAzyLdZ42iVZdHdOwmPd5Ioe6fjApuSftuSckZ9svKpajbyjEuhVg/exec
- **API Key** : configurable par utilisateur
- **Actions** : getDashboard, getValidations, saveValidation, addEleve, deleteEleve, addJournalEntry, etc.

## Déploiement

### Pour déployer le backend Édu
1. Aller sur https://script.google.com/
2. Créer un nouveau projet
3. Copier le contenu de Code_edu_v2.4.0.gs
4. Configurer les propriétés du script : API_KEY, GEMINI_API_KEY
5. Déployer en tant qu'application Web (accès : tout le monde)
6. Copier l'URL de déploiement

## Architecture
- Event-sourcing : EventLog immutable
- Projections CQRS : Séances, Élèves, Évaluations
- Sécurité : fail-closed, whitelist événements, LockService
