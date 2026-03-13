# Changelog — inerWeb TT v5.1

## [5.1.0] - 2026-03-12

### Corrections critiques
- Correction cfg.clef → cfg.apiKey (synchronisation journal morte)
- Correction recherche utilisateur u.cle → multi-clé (u.cle||u.apiKey||u.key)
- Correction données démo incohérentes (épreuves CAP vs MFER mélangées)
- 27 failles XSS corrigées dans inerweb_prof.html (innerHTML non échappé)
- Failles XSS corrigées dans photos.js (filename non sanitisé)
- Clé API déplacée de l'URL vers le body JSON pour les requêtes POST
- Appel fetch() direct contournant apiCall() remplacé

### Améliorations UX — Professeur
- Dashboard classe obligatoire (plus de "Toutes classes")
- Séparateurs visuels dans la barre de navigation
- Barres de progression filière-dynamiques dans les cartes élèves
- Mini-radars de compétences intégrés au dashboard
- Amélioration contraste filtre + labels statistiques

### Améliorations UX — Tuteur
- Barre de progression visuelle des critères validés
- Modale de confirmation avant envoi des évaluations
- Targets tactiles agrandis (44px minimum)

### Améliorations UX — Élève
- Boutons Modifier/Supprimer sur les entrées de journal en attente
- Distinction visuelle des entrées non synchronisées (bordure orange, badge "En attente")
- Modale de confirmation async (remplace confirm())
- Targets tactiles agrandis

### Sécurité
- API write via POST (plus de données sensibles dans l'URL)
- Échappement XSS systématique sur les données utilisateur
- Sanitisation des noms de fichiers photos
- alert() et console.log de debug supprimés en production

### Architecture
- Création de core.js (utilitaires partagés : esc, toast, dateFR, safeParse, etc.)
- Intégration core.js dans tuteur et élève
- Attributs ARIA ajoutés (role, aria-label, aria-live)
- Audit technique complet (AUDIT_TECHNIQUE.md)

### Évaluation / Jury
- Système de pool d'évaluateurs avec types (Enseignant, Professionnel, Tuteur, Externe)
- Commissions d'évaluation par épreuve
- Désignation par épreuve avec badges visuels
- Rétro-compatibilité avec l'ancien format jury

### Contact
- Champs téléphone élève et tuteur
- Boutons WhatsApp intégrés (💬E, 💬T)
- Bouton édition élève (✏️)
