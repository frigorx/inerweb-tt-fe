# Changelog — INERWEB PROG+ v5.2

## [5.2.0] — 2026-03-13

### Renommage
- Projet renommé de "inerWeb TT" vers "INERWEB PROG+"
- Tous les titres et headers mis à jour

### Corrections critiques
- Bug 30 élèves supprimé : syncAll() traite maintenant TOUS les élèves par lots de 10
- Limitation slice(0,30) supprimée dans prof.html et prof_v4.html
- TODO/FIXME résolus : exportIdentifiants (PDF), showKey (API), pré-remplissage evalData
- alert()/confirm() restants remplacés par toast()/modale
- console.log de debug supprimés dans sync-queue.js

### Synchronisation robuste (Phase 3)
- js/core/syncQueue.js : wrapper amélioré avec smartSend() (online→apiCall, offline→queue)
- Validations et journal passent par la syncQueue quand offline
- Tuteur : retryPending() automatique au chargement et à la reconnexion
- Tuteur : anti-doublon par élève dans les pending
- Élève : retry automatique des entrées journal à la reconnexion (event online)

### Sécurisation API (Phase 4)
- Tuteur : saveEvalTuteur converti en POST (token dans body)
- Élève : addJournalEntry converti en POST (token dans body)
- Aucune donnée sensible en GET pour les écritures

### Découpage monolithe (Phase 7)
- js/core/core.js — Utilitaires partagés
- js/core/state.js — État centralisé (appState + 21 alias defineProperty)
- js/core/api.js — apiCall centralisé (POST/GET)
- js/core/utils.js — Stockage, sync, saveLocal
- js/core/syncQueue.js — Queue offline-first
- js/prog/prog-model.js — Modèle filières/compétences
- js/prog/prog-data.js — Calculs progression
- js/prog/prog-ui.js — Rendu progression

### Architecture filière (Phase 8)
- data/formations.json : référentiel pédagogique complet (CAP IFCA, Bac Pro MFER, 2nde TNE)
- Toutes les compétences, critères, situations, périodes documentés

### Nouveaux modules (Phases 9-10)
- js/radar/radarCompetences.js : radar classe, progression élève, couverture compétences
- js/alerts/alertSystem.js : alertes automatiques (absent, sans progression, en difficulté, PFMP manquante, éval incomplète)

### UX (Phase 11)
- onclick inline convertis en event listeners (navigation prof, tuteur, élève)
- Délégation d'événements sur nav, filtres

### Page Progression (Phase 12)
- progression.html : arborescence Année → Période → Séquence → Compétences
- Sélecteur classe/filière, responsive mobile-first

### Tests (Phase 13)
- tests/smoke-test.html : 130 tests couvrant tous les modules

### Nettoyage (Phase 15)
- inerweb_prof_v4.html marqué ARCHIVE
- Modules radarCompetences et alertSystem ajoutés au chargeur

### Documentation (Phase 14)
- docs/AUDIT_V5_2.md : audit technique complet
- docs/ARCHITECTURE_PROG_PLUS.md : architecture modulaire
