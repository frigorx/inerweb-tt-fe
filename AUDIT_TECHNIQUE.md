# AUDIT TECHNIQUE — inerWeb TT Frontend v5.0

Date : 2026-03-12

## Architecture

**Type** : SPA multi-rôles (prof/élève/tuteur/admin)
**Stack** : HTML5/CSS3 + Vanilla JS ES6 (IIFE) + IndexedDB + localStorage
**Backend** : Google Apps Script (REST GET)
**Exports** : jsPDF, SheetJS, QRCode.js
**Graphiques** : Canvas natif (radar.js)

## Arborescence

```
inerweb-tt-fe/
├── index.html              (317 L) — Portail redirection rôles
├── inerweb_prof.html       (4421 L) — Interface professeur (monolithe principal)
├── inerweb_prof_v4.html    (1584 L) — Ancienne version v4 (à archiver)
├── inerweb_eleve.html      (933 L) — Espace élève / Journal
├── inerweb_tuteur.html     (1219 L) — Évaluateur entreprise
├── inerweb_admin.html      (854 L) — Panel admin
├── aide.html               (904 L) — Guide utilisateur
├── aide_tuteur.html        (551 L) — Guide tuteur
├── demo.html               (539 L) — Page démo
├── js/
│   ├── sync-queue.js       (410 L) — File sync IndexedDB
│   ├── activites.js        (1156 L) — Séances évaluation
│   ├── jury.js             (481 L) — Pool évaluateurs + commissions
│   ├── phases.js           (165 L) — Cycle formatif/certificatif
│   ├── exposition.js       (136 L) — % exposition pédagogique
│   ├── impossibilites.js   (192 L) — Motifs impossibilités PFMP
│   ├── tache-complexe.js   (145 L) — Oral rattrapage
│   ├── signatures.js       (380 L) — Signatures canvas
│   ├── photos.js           (517 L) — Photos IndexedDB
│   ├── tp-manager.js       (413 L) — Sessions pédagogiques
│   ├── historique.js       (388 L) — Fil chronologique
│   ├── alertes.js          (239 L) — Analyse risques
│   ├── rapport-pdf.js      (810 L) — PDF jsPDF
│   ├── export-excel.js     (247 L) — Excel SheetJS
│   ├── eval-tuteur.js      (529 L) — Éval tuteur PFMP
│   ├── fusion-eval.js      (289 L) — Fusion backups
│   ├── radar.js            (533 L) — Radar compétences canvas
│   └── demo-guide.js       (637 L) — Guide interactif
```

**Total** : ~19 000 lignes

## Modules critiques

1. **inerweb_prof.html** — Monolithe 4421L, contient toute la logique prof
2. **sync-queue.js** — Fiabilité synchronisation offline
3. **activites.js** — Cœur métier évaluations
4. **radar.js** — Visualisation compétences
5. **rapport-pdf.js** — Export réglementaire

## Variables globales

- `students[]`, `validations{}`, `notes{}`, `pfmpData{}`
- `cfg{}`, `appCfg{}`, `cur`, `curPhase`
- `FILIERES{}`, `COMP_EP2/EP3/E31/E32/E33/TNE[]`
- `NV_PCT{}`, `NV_LBL{}`, `NV[]`

## Stockage

| Mécanisme | Clé | Contenu |
|-----------|-----|---------|
| localStorage | `inerweb-tt-fe-v1` | Snapshot principal |
| localStorage | `inerweb-tt-fe-cfg` | Config utilisateur |
| IndexedDB | `inerwebtt-fe-db` v3 | data, backups, config, photos, syncQueue |

## Flux principaux

1. **Sync** : loadLocal → apiCall → saveLocal (+ syncQueue offline)
2. **Évaluation** : pushVal → validations[] → saveLocal → apiCall/syncQueue
3. **Export** : calcNote → jsPDF/SheetJS → download

## Risques identifiés

- API en GET avec données en querystring (sécurité)
- innerHTML massif sans échappement systématique (XSS)
- Secrets (apiKey) en localStorage côté client
- Monolithe prof.html difficile à maintenir
- Pas de tests automatisés
- Duplication utilitaires entre pages
