/**
 * demo-guide.js — Module de guide interactif pour inerWeb TT
 *
 * Affiche un panneau latéral droit avec du contenu contextuel
 * selon la page et l'onglet actif. Inclut une visite guidée.
 *
 * COMPORTEMENT :
 * - Actif par défaut sur toutes les pages pour tous les rôles
 * - L'admin peut désactiver/masquer le guide via la config
 * - Permissions par rôle : prof (tout), tuteur (tuteur), élève (élève), admin (tout)
 * - Config stockée dans localStorage('inerweb-tt-fe-guide-cfg')
 *
 * Module autonome — s'initialise au chargement, injecte son propre CSS.
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // 1. CONFIGURATION & PERMISSIONS
  // ═══════════════════════════════════════════════════════════
  const GUIDE_STORAGE_KEY = 'inerweb-tt-fe-guide-cfg';

  /**
   * Configuration par défaut — tout le monde voit tout.
   * L'admin peut modifier via l'interface d'admin.
   *
   * Structure :
   *   enabled     : booléen global (le guide est-il actif ?)
   *   roles       : quelles pages chaque rôle peut voir
   *                  'all' = tout, sinon liste de pages ['prof','tuteur','eleve','admin']
   *   forceDemo   : n'activer QUE en mode démo (?demo=1)
   */
  const DEFAULT_CONFIG = {
    enabled: true,
    forceDemo: false,
    roles: {
      prof: ['all'],
      tuteur: ['tuteur'],
      eleve: ['eleve'],
      admin: ['all']
    }
  };

  /** Charge la config depuis localStorage ou retourne la config par défaut */
  function loadGuideConfig() {
    try {
      const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        return Object.assign({}, DEFAULT_CONFIG, cfg);
      }
    } catch (e) { /* ignore */ }
    return Object.assign({}, DEFAULT_CONFIG);
  }

  /** Sauvegarde la config dans localStorage */
  function saveGuideConfig(cfg) {
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) { /* ignore */ }
  }

  /** Expose la config pour que l'admin puisse la modifier */
  window.getGuideConfig = loadGuideConfig;
  window.setGuideConfig = function (cfg) {
    saveGuideConfig(cfg);
    // Recharger pour appliquer immédiatement
    location.reload();
  };

  /** Détecte si le mode démo est actif */
  function isDemoMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('demo') === '1' || window.demoMode === true;
  }

  /** Détecte le rôle actuel à partir de la page */
  function getCurrentRole() {
    const page = getPageKey();
    if (page === 'prof') return 'prof';
    if (page === 'eleve') return 'eleve';
    if (page === 'tuteur') return 'tuteur';
    if (page === 'admin') return 'admin';
    return 'prof'; // fallback
  }

  /** Vérifie si le guide doit être affiché */
  function shouldShowGuide() {
    const cfg = loadGuideConfig();

    // Désactivé globalement par l'admin
    if (!cfg.enabled) return false;

    // Mode forceDemo : ne s'affiche qu'avec ?demo=1
    if (cfg.forceDemo && !isDemoMode()) return false;

    // Vérifier les permissions par rôle
    const role = getCurrentRole();
    const page = getPageKey();
    const allowedPages = cfg.roles[role] || ['all'];

    if (allowedPages.includes('all')) return true;
    if (allowedPages.includes(page)) return true;

    return false;
  }

  // ═══════════════════════════════════════════════════════════
  // 2. CONTENU CONTEXTUEL PAR PAGE / ONGLET
  // ═══════════════════════════════════════════════════════════

  /** Contenu pour inerweb_prof.html, indexé par id d'onglet */
  const PROF_TABS = {
    dashboard: {
      title: '🏠 Tableau de bord',
      body:
        "C'est votre page d'accueil. Vous y voyez d'un coup d'œil :\n" +
        '• Le nombre total d\u2019élèves\n' +
        '• Les alertes (élèves sans évaluation récente)\n' +
        '• Les épreuves clôturées\n' +
        '• Les élèves actuellement en stage',
      tips: [
        'Utilisez le filtre « Classe » pour afficher uniquement les élèves d\u2019une filière (CAP IFCA, Bac Pro MFER ou 2nde TNE).'
      ],
      hints: [
        'Cliquez sur une fiche élève pour accéder directement à ses évaluations.'
      ]
    },
    eleves: {
      title: '👥 Gestion des élèves',
      body:
        'Ici vous pouvez :\n' +
        '• ➕ Ajouter un élève manuellement\n' +
        '• 📥 Importer une liste CSV/Excel\n' +
        '• 📱 Générer les QR codes d\u2019accès\n' +
        '• 📷 Scanner un QR code\n' +
        '• 🔄 Synchroniser avec le serveur\n' +
        '• 🎓 Promouvoir les élèves en fin d\u2019année',
      tips: [
        'Import CSV : Le fichier doit contenir les colonnes « nom » et « prenom ». Les colonnes « classe », « groupe » et « annee » sont optionnelles.',
        'Le système détecte automatiquement la filière à partir de la classe choisie.'
      ]
    },
    activites: {
      title: '📋 Activités pédagogiques',
      body:
        'Créez des TP et activités pour évaluer les compétences.\n' +
        '• Chaque activité est liée à une ou plusieurs compétences\n' +
        '• Vous pouvez évaluer pendant un TP directement\n' +
        '• Les activités sont classées par date',
      tips: [
        "C'est le point d'entrée principal pour évaluer les élèves."
      ]
    },
    progression: {
      title: '📅 Progression',
      body:
        'Suivez la progression temporelle de vos élèves :\n' +
        '• Chronologie des évaluations mois par mois\n' +
        '• Vue d\u2019ensemble par compétence\n' +
        '• Filtrage par élève',
      tips: [
        'Utile pour préparer les conseils de classe et identifier les élèves en retard.'
      ]
    },
    stage: {
      title: '🏢 Suivi de stage PFMP',
      body:
        'Gérez les périodes de formation en milieu professionnel :\n' +
        '• Définir les dates de PFMP\n' +
        '• Voir les entreprises et tuteurs\n' +
        '• Suivre le journal de stage des élèves\n' +
        '• Consulter les évaluations tuteur',
      tips: [
        'Les tuteurs peuvent évaluer via leur interface dédiée (QR code).'
      ]
    },
    bilan: {
      title: '🏆 Bilan & Notes',
      body:
        'Consultez les bilans par épreuve :\n' +
        '• Vue d\u2019ensemble des compétences acquises\n' +
        '• Calcul automatique des notes selon les barèmes officiels\n' +
        '• Possibilité de clôturer une épreuve\n' +
        '• Verrouillage des notes après clôture',
      warnings: [
        'Une épreuve clôturée ne peut plus être modifiée (sauf par un admin).'
      ]
    },
    rapport: {
      title: '📝 Rapport',
      body:
        'Générez des rapports d\u2019inspection :\n' +
        '• Rapport PDF formaté pour les inspecteurs\n' +
        '• Bilan complet par épreuve et par élève\n' +
        '• Statistiques de progression',
      tips: [
        'Le rapport est généré localement en PDF, aucune connexion nécessaire.'
      ]
    },
    export: {
      title: '📤 Exports',
      body:
        'Exportez les données sous différents formats :\n' +
        '• 📄 PDF — Fiches individuelles, grilles de compétences\n' +
        '• 📊 Excel — Tableaux récapitulatifs\n' +
        '• 💾 Sauvegarde — Export complet des données\n' +
        '• 📋 Rapport d\u2019inspection — PDF formaté pour les inspecteurs',
      tips: [
        'Les exports PDF sont générés localement, pas besoin de connexion.'
      ]
    },
    config: {
      title: '⚙️ Configuration',
      body:
        'Paramétrez votre installation :\n' +
        '• URL de l\u2019API Google Apps Script\n' +
        "• Clé d'authentification\n" +
        '• Gestion des classes et groupes\n' +
        "• Paramètres d'affichage"
    },
    admin: {
      title: '👑 Administration',
      body:
        'Gérez les droits et utilisateurs :\n' +
        '• Créer/modifier des comptes enseignants\n' +
        '• Attribuer des classes aux enseignants\n' +
        '• Gérer les droits (évaluation, export, clôture)',
      warnings: [
        'Cet onglet n\u2019est visible que pour les administrateurs.'
      ]
    }
  };

  /** Contenu pour les autres pages */
  const PAGE_CONTENT = {
    eleve: {
      title: '🎓 Espace Élève',
      body:
        "L'élève peut :\n" +
        '• Consulter sa progression par compétence\n' +
        '• Voir ses évaluations avec les commentaires du professeur\n' +
        '• Remplir son journal de stage quotidien\n' +
        '• Voir ses informations de PFMP',
      tips: [
        'En mode démo, vous êtes connecté en tant que Martin DUPONT (CAP IFCA 1).',
        'Le journal de stage permet de noter chaque jour les activités réalisées en entreprise.'
      ],
      hints: [
        'Les compétences en vert sont acquises, en jaune en cours d\u2019acquisition, en rouge non acquises.'
      ]
    },
    tuteur: {
      title: '🏢 Espace Tuteur Entreprise',
      body:
        'Le tuteur peut :\n' +
        "• Évaluer les compétences de l'élève en PFMP\n" +
        '• Noter le comportement professionnel\n' +
        '• Ajouter des observations\n' +
        "• Signer électroniquement l'évaluation",
      tips: [
        'Les niveaux vont de « Non Évalué » à « Parfaitement Maîtrisé ».',
        "Concentrez-vous sur ce que l'élève sait FAIRE, pas sur ce qu'il sait dire.",
        'Chaque compétence peut être évaluée à plusieurs reprises au cours du stage.'
      ],
      hints: [
        'Utilisez le bouton « Signer » en bas de page pour valider votre évaluation.'
      ]
    },
    admin: {
      title: '🔐 Administration',
      body:
        "L'administrateur peut :\n" +
        '• Gérer les utilisateurs (enseignants, lecteurs)\n' +
        '• Attribuer des classes par filière\n' +
        "• Générer/régénérer les tokens d'accès élèves et tuteurs\n" +
        "• Consulter le journal d'administration\n" +
        '• Gérer les clés de sécurité\n' +
        '• Configurer le guide interactif (affichage, permissions)',
      tips: [
        'En mode démo, la connexion est simulée.',
        'Le guide interactif est visible par défaut pour tous les utilisateurs. Vous pouvez le configurer dans l\u2019onglet « Guide ».'
      ]
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 3. ÉTAPES DE LA VISITE GUIDÉE (page Prof)
  // ═══════════════════════════════════════════════════════════
  const TOUR_STEPS_PROF = [
    {
      selector: '.app-header',
      text: 'Voici la barre d\u2019en-tête. Le point vert indique que vous êtes connecté au serveur. Cliquez sur « Sync » pour synchroniser les données.'
    },
    {
      selector: '[data-tab="dashboard"]',
      text: 'Le tableau de bord affiche tous vos élèves avec leur progression. C\u2019est votre page d\u2019accueil.'
    },
    {
      selector: '.filter-bar',
      text: 'Filtrez par classe (CAP IFCA, Bac Pro MFER, 2nde TNE), par année ou par groupe pour trouver rapidement un élève.'
    },
    {
      selector: '.sc, .student-grid',
      text: 'Chaque fiche représente un élève. Les barres de couleur montrent la progression par épreuve. Cliquez pour évaluer.'
    },
    {
      selector: '[data-tab="eleves"]',
      text: 'Gérez votre liste d\u2019élèves : ajout manuel, import CSV/Excel, QR codes, synchronisation.'
    },
    {
      selector: '[data-tab="activites"]',
      text: 'Créez des TP et activités pédagogiques. C\u2019est le point d\u2019entrée principal pour évaluer les compétences.'
    },
    {
      selector: '[data-tab="stage"]',
      text: 'Suivez les PFMP : dates, entreprises, tuteurs, journal de stage et évaluations tuteur.'
    },
    {
      selector: '[data-tab="bilan"]',
      text: 'Consultez les notes et bilans par épreuve. Clôturez les épreuves quand les évaluations sont terminées.'
    },
    {
      selector: '[data-tab="export"]',
      text: 'Exportez en PDF (fiches, grilles), Excel (tableaux), ou faites une sauvegarde complète de vos données.'
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // 4. INJECTION DU CSS
  // ═══════════════════════════════════════════════════════════
  function injectStyles() {
    if (document.getElementById('demo-guide-styles')) return;

    const css = `
      /* --- Panneau principal --- */
      #demo-guide-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 320px;
        height: 100vh;
        background: #fff;
        box-shadow: -4px 0 24px rgba(0,0,0,.12);
        z-index: 9000;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform .3s cubic-bezier(.4,0,.2,1);
        font-family: 'Nunito', sans-serif;
      }
      #demo-guide-panel.open {
        transform: translateX(0);
      }

      /* Header */
      #demo-guide-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1b3a63;
        color: #fff;
        height: 48px;
        min-height: 48px;
        padding: 0 1rem;
        font-size: 0.95rem;
        font-weight: 700;
      }
      #demo-guide-header button {
        background: none;
        border: none;
        color: #fff;
        font-size: 1.3rem;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      #demo-guide-header button:hover { opacity: .7; }

      /* Contenu */
      #demo-guide-body {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        font-size: 0.85rem;
        line-height: 1.55;
        color: #333;
      }

      /* Titre de section */
      .dg-title {
        font-size: 1.05rem;
        font-weight: 700;
        margin-bottom: .6rem;
        color: #1b3a63;
      }

      /* Paragraphe principal */
      .dg-text {
        white-space: pre-line;
        margin-bottom: .8rem;
      }
      .dg-text .dg-bullet { color: #ff6b35; font-weight: 700; }

      /* Bloc astuce */
      .dg-tip {
        background: #fef9e7;
        border-left: 4px solid #f1c40f;
        padding: .55rem .75rem;
        margin-bottom: .6rem;
        border-radius: 0 6px 6px 0;
        font-size: 0.82rem;
      }

      /* Bloc avertissement */
      .dg-warn {
        background: #fde8e6;
        border-left: 4px solid #e74c3c;
        padding: .55rem .75rem;
        margin-bottom: .6rem;
        border-radius: 0 6px 6px 0;
        font-size: 0.82rem;
      }

      /* Bloc indication */
      .dg-hint {
        background: #eaf4fe;
        border-left: 4px solid #3498db;
        padding: .55rem .75rem;
        margin-bottom: .6rem;
        border-radius: 0 6px 6px 0;
        font-size: 0.82rem;
      }

      /* Badge mode démo */
      .dg-demo-badge {
        display: inline-block;
        background: #ff6b35;
        color: #fff;
        font-size: .65rem;
        font-weight: 800;
        padding: .15rem .5rem;
        border-radius: 20px;
        margin-bottom: .8rem;
      }

      /* Bouton visite guidée */
      #demo-guide-tour-btn {
        display: block;
        width: calc(100% - 2rem);
        margin: .5rem 1rem;
        padding: .55rem;
        background: #ff6b35;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        text-align: center;
        font-family: 'Nunito', sans-serif;
        transition: background .2s;
      }
      #demo-guide-tour-btn:hover { background: #e55a28; }

      /* Séparateur */
      .dg-sep {
        border: none;
        border-top: 1px solid #eee;
        margin: .8rem 0;
      }

      /* Bouton flottant */
      #demo-guide-fab {
        position: fixed;
        bottom: 5rem;
        right: 1.5rem;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #1b3a63;
        color: #fff;
        border: none;
        box-shadow: 0 4px 14px rgba(0,0,0,.25);
        font-size: 1.5rem;
        cursor: pointer;
        z-index: 9001;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform .2s, box-shadow .2s;
        font-family: 'Nunito', sans-serif;
      }
      #demo-guide-fab:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 20px rgba(0,0,0,.3);
      }
      #demo-guide-fab .fab-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 16px;
        height: 16px;
        background: #ff6b35;
        border-radius: 50%;
        border: 2px solid #fff;
      }

      /* --- Visite guidée overlay --- */
      #demo-tour-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        z-index: 10000;
        pointer-events: none;
        transition: opacity .3s;
      }
      #demo-tour-overlay.active { pointer-events: auto; }

      #demo-tour-highlight {
        position: absolute;
        border: 3px solid #ff6b35;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,.55);
        z-index: 10001;
        pointer-events: none;
        transition: all .35s cubic-bezier(.4,0,.2,1);
        display: none;
      }

      #demo-tour-tooltip {
        position: absolute;
        z-index: 10002;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,.22);
        padding: 1rem 1.2rem;
        max-width: 340px;
        font-family: 'Nunito', sans-serif;
        font-size: 0.88rem;
        color: #333;
        line-height: 1.5;
        display: none;
      }
      .tour-step-indicator {
        font-size: 0.72rem;
        color: #888;
        margin-bottom: .4rem;
        font-weight: 700;
      }
      .tour-text { margin-bottom: .8rem; }
      .tour-nav { display: flex; gap: .5rem; justify-content: flex-end; }
      .tour-nav button {
        padding: .35rem .8rem;
        border: none;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        transition: opacity .2s;
      }
      .tour-nav button:hover { opacity: .85; }
      .tour-prev { background: #eee; color: #555; }
      .tour-next { background: #ff6b35; color: #fff; }
      .tour-end { background: #27ae60; color: #fff; }

      /* Flèche tooltip */
      #demo-tour-tooltip::before {
        content: '';
        position: absolute;
        width: 14px; height: 14px;
        background: #fff;
        transform: rotate(45deg);
      }
      #demo-tour-tooltip.arrow-top::before { top: -7px; left: 24px; }
      #demo-tour-tooltip.arrow-bottom::before { bottom: -7px; left: 24px; }

      /* --- Responsive mobile --- */
      @media (max-width: 768px) {
        #demo-guide-panel { width: 100%; }
        #demo-guide-fab {
          bottom: 4.5rem;
          right: 1rem;
          width: 48px;
          height: 48px;
          font-size: 1.3rem;
        }
        #demo-tour-tooltip {
          max-width: calc(100vw - 2rem);
          left: 1rem !important;
          right: 1rem !important;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'demo-guide-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════
  // 5. CONSTRUCTION DU DOM
  // ═══════════════════════════════════════════════════════════

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'demo-guide-panel';

    // Header
    const header = document.createElement('div');
    header.id = 'demo-guide-header';
    header.innerHTML = '<span>📖 Guide interactif</span>';
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Fermer le guide';
    closeBtn.addEventListener('click', togglePanel);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Bouton visite guidée (page prof uniquement)
    if (isPageProf()) {
      const tourBtn = document.createElement('button');
      tourBtn.id = 'demo-guide-tour-btn';
      tourBtn.textContent = '▶ Lancer la visite guidée';
      tourBtn.addEventListener('click', startTour);
      panel.appendChild(tourBtn);
    }

    // Body
    const body = document.createElement('div');
    body.id = 'demo-guide-body';
    panel.appendChild(body);

    document.body.appendChild(panel);
    return panel;
  }

  function createFAB() {
    const fab = document.createElement('button');
    fab.id = 'demo-guide-fab';
    fab.innerHTML = '📖';
    fab.title = 'Guide interactif — cliquez pour ouvrir';

    // Badge "nouveau" si la visite n'a jamais été faite
    if (isPageProf() && localStorage.getItem('demo-guide-tour-done') !== '1') {
      const badge = document.createElement('span');
      badge.className = 'fab-badge';
      fab.appendChild(badge);
    }

    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);
    return fab;
  }

  function createTourOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'demo-tour-overlay';

    const highlight = document.createElement('div');
    highlight.id = 'demo-tour-highlight';
    overlay.appendChild(highlight);

    const tooltip = document.createElement('div');
    tooltip.id = 'demo-tour-tooltip';
    overlay.appendChild(tooltip);

    document.body.appendChild(overlay);
    return overlay;
  }

  // ═══════════════════════════════════════════════════════════
  // 6. LOGIQUE DU PANNEAU
  // ═══════════════════════════════════════════════════════════

  let panelEl, fabEl, overlayEl;
  let currentTourStep = -1;

  function togglePanel() {
    const isOpen = panelEl.classList.toggle('open');
    localStorage.setItem('demo-guide-open', isOpen ? '1' : '0');
  }

  function openPanel() {
    if (!panelEl.classList.contains('open')) {
      panelEl.classList.add('open');
      localStorage.setItem('demo-guide-open', '1');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 7. DÉTECTION DE PAGE
  // ═══════════════════════════════════════════════════════════

  function getPageKey() {
    const path = location.pathname.toLowerCase();
    if (path.includes('inerweb_prof')) return 'prof';
    if (path.includes('inerweb_eleve')) return 'eleve';
    if (path.includes('inerweb_tuteur')) return 'tuteur';
    if (path.includes('inerweb_admin')) return 'admin';
    return 'unknown';
  }

  function isPageProf() {
    return getPageKey() === 'prof';
  }

  // ═══════════════════════════════════════════════════════════
  // 8. RENDU DU CONTENU
  // ═══════════════════════════════════════════════════════════

  function formatBody(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/•/g, '<span class="dg-bullet">•</span>')
      .replace(/\n/g, '<br>');
  }

  function renderContent(data) {
    if (!data) return '<p style="color:#999;text-align:center;padding:2rem 0">Aucun guide disponible pour cette page.</p>';

    let html = '';

    // Badge mode démo
    if (isDemoMode()) {
      html += '<span class="dg-demo-badge">MODE DÉMO</span> ';
    }

    html += '<div class="dg-title">' + data.title + '</div>';
    html += '<div class="dg-text">' + formatBody(data.body) + '</div>';

    if (data.tips && data.tips.length) {
      data.tips.forEach(function (tip) {
        html += '<div class="dg-tip">💡 ' + tip + '</div>';
      });
    }
    if (data.warnings && data.warnings.length) {
      data.warnings.forEach(function (w) {
        html += '<div class="dg-warn">⚠️ ' + w + '</div>';
      });
    }
    if (data.hints && data.hints.length) {
      data.hints.forEach(function (h) {
        html += '<div class="dg-hint">👆 ' + h + '</div>';
      });
    }
    return html;
  }

  function updateContent(tabId) {
    var body = document.getElementById('demo-guide-body');
    if (!body) return;

    var pageKey = getPageKey();
    var data = null;

    if (pageKey === 'prof') {
      data = PROF_TABS[tabId] || PROF_TABS['dashboard'];
    } else {
      data = PAGE_CONTENT[pageKey];
    }

    body.innerHTML = renderContent(data);
  }

  // ═══════════════════════════════════════════════════════════
  // 9. OBSERVATION DES ONGLETS (page Prof)
  // ═══════════════════════════════════════════════════════════

  function observeTabs() {
    if (!isPageProf()) return;

    // Onglet actif au chargement
    var activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn) {
      updateContent(activeBtn.dataset.tab || 'dashboard');
    } else {
      updateContent('dashboard');
    }

    // Écoute les clics sur les onglets
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.nav-btn');
      if (!btn) return;
      var tabId = btn.dataset.tab;
      if (tabId) {
        setTimeout(function () { updateContent(tabId); }, 50);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 10. VISITE GUIDÉE
  // ═══════════════════════════════════════════════════════════

  function startTour() {
    currentTourStep = 0;
    overlayEl.classList.add('active');
    showTourStep();
    if (panelEl.classList.contains('open')) {
      panelEl.classList.remove('open');
    }
  }

  function endTour() {
    currentTourStep = -1;
    overlayEl.classList.remove('active');
    document.getElementById('demo-tour-highlight').style.display = 'none';
    document.getElementById('demo-tour-tooltip').style.display = 'none';
    localStorage.setItem('demo-guide-tour-done', '1');
    // Retirer le badge "nouveau" du FAB
    var badge = fabEl.querySelector('.fab-badge');
    if (badge) badge.remove();
    openPanel();
  }

  function showTourStep() {
    var steps = TOUR_STEPS_PROF;
    if (currentTourStep < 0 || currentTourStep >= steps.length) {
      endTour();
      return;
    }

    var step = steps[currentTourStep];
    var el = document.querySelector(step.selector);
    var highlight = document.getElementById('demo-tour-highlight');
    var tooltip = document.getElementById('demo-tour-tooltip');

    if (!el) {
      currentTourStep++;
      if (currentTourStep >= steps.length) { endTour(); } else { showTourStep(); }
      return;
    }

    var rect = el.getBoundingClientRect();
    var pad = 6;
    highlight.style.display = 'block';
    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    var isLast = currentTourStep === steps.length - 1;
    var isFirst = currentTourStep === 0;

    var html = '';
    html += '<div class="tour-step-indicator">Étape ' + (currentTourStep + 1) + ' sur ' + steps.length + '</div>';
    html += '<div class="tour-text">' + step.text + '</div>';
    html += '<div class="tour-nav">';
    if (!isFirst) {
      html += '<button class="tour-prev">◀ Précédent</button>';
    }
    if (isLast) {
      html += '<button class="tour-end">✔ Terminer</button>';
    } else {
      html += '<button class="tour-next">Suivant ▶</button>';
    }
    html += '</div>';
    tooltip.innerHTML = html;

    tooltip.style.display = 'block';
    tooltip.className = '';

    var tooltipTop = rect.bottom + 16;
    var tooltipLeft = Math.max(8, rect.left);

    if (tooltipTop + 140 > window.innerHeight) {
      tooltipTop = Math.max(8, rect.top - 160);
      tooltip.classList.add('arrow-bottom');
    } else {
      tooltip.classList.add('arrow-top');
    }

    if (tooltipLeft + 340 > window.innerWidth) {
      tooltipLeft = Math.max(8, window.innerWidth - 350);
    }

    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';

    // Navigation
    var prevBtn = tooltip.querySelector('.tour-prev');
    var nextBtn = tooltip.querySelector('.tour-next');
    var endBtn = tooltip.querySelector('.tour-end');

    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); currentTourStep--; showTourStep(); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); currentTourStep++; showTourStep(); });
    if (endBtn) endBtn.addEventListener('click', function (e) { e.stopPropagation(); endTour(); });
  }

  function onOverlayClick(e) {
    if (e.target === overlayEl) endTour();
  }

  // ═══════════════════════════════════════════════════════════
  // 11. INITIALISATION
  // ═══════════════════════════════════════════════════════════

  function init() {
    // Vérifier les permissions
    if (!shouldShowGuide()) return;

    injectStyles();

    panelEl = createPanel();
    fabEl = createFAB();
    overlayEl = createTourOverlay();

    overlayEl.addEventListener('click', onOverlayClick);

    // Contenu initial
    if (isPageProf()) {
      observeTabs();
    } else {
      updateContent(getPageKey());
    }

    // Restaurer l'état du panneau
    var savedState = localStorage.getItem('demo-guide-open');
    if (savedState === '1') {
      panelEl.classList.add('open');
    }
    // Première visite sur la page prof : ouvrir automatiquement
    else if (savedState === null && isPageProf()) {
      openPanel();
    }

    // Repositionner le tooltip si on redimensionne
    window.addEventListener('resize', function () {
      if (currentTourStep >= 0) showTourStep();
    });
  }

  // Lancement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Petit délai pour laisser l'app se charger
    setTimeout(init, 300);
  }

})();
