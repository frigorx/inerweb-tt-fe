/**
 * utils.js — Utilitaires supplementaires
 * Extrait de inerweb_prof.html
 * Expose : window.setSyncState, window.saveLocal, window.saveLocalData,
 *          window.loadLocalData, window.updateAll, window.updateStor,
 *          window.syncAll, window.loadLocal, window.pushVal
 */
;(function(){
  'use strict';

  /* ═══ STORAGE KEYS ═══ */
  var SK = 'inerweb-tt-fe-v1';
  var SCFG = 'inerweb-tt-fe-cfg';
  var SPART = 'inerweb-tt-fe-parts';
  var SUSERS = 'inerweb-tt-fe-users';
  var SCLASSES = 'inerweb-tt-fe-classes';
  var SJOURNAL = 'inerweb-tt-fe-journal';

  window.SK = SK;
  window.SCFG = SCFG;
  window.SPART = SPART;
  window.SUSERS = SUSERS;
  window.SCLASSES = SCLASSES;
  window.SJOURNAL = SJOURNAL;

  /* ═══ SYNC STATE ═══ */
  function setSyncState(s) {
    var d = document.getElementById('syncDot'), l = document.getElementById('syncLbl');
    if (!d) return;
    d.className = 'sync-dot';
    if (s === 'ok') { l.textContent = 'Synchronise'; }
    if (s === 'syncing') { d.classList.add('syncing'); l.textContent = 'Sync...'; }
    if (s === 'error') { d.classList.add('offline'); l.textContent = 'Hors-ligne'; }
  }

  /* ═══ SAVE LOCAL ═══ */
  function saveLocal() {
    saveLocalData().catch(function() { toast('Erreur sauvegarde', 'err'); });
  }

  async function saveLocalData() {
    var data = { id: 'main', students: students, validations: validations, notes: notes, pfmpData: pfmpData, appCfg: appCfg, customCriteria: customCriteria, compLocks: compLocks, sharedDocs: sharedDocs, lastSave: new Date().toISOString() };
    if (window.db) { await saveIDB('data', data); }
    try { localStorage.setItem(SK, JSON.stringify({ students: students, validations: validations, notes: notes, pfmpData: pfmpData, appCfg: appCfg, customCriteria: customCriteria, compLocks: compLocks, sharedDocs: sharedDocs })); } catch(e) {}
    updateStor();
  }

  async function loadLocalData() {
    if (window.db) {
      var d = await loadIDB('data', 'main');
      if (d) {
        students = d.students || []; validations = d.validations || {}; notes = d.notes || {};
        pfmpData = d.pfmpData || {}; appCfg = d.appCfg || {};
        customCriteria = d.customCriteria || {}; compLocks = d.compLocks || {}; sharedDocs = d.sharedDocs || [];
        window.students = students; window.validations = validations; window.appCfg = appCfg;
        return true;
      }
    }
    var raw = localStorage.getItem(SK);
    if (!raw) return false;
    var p;
    try { p = JSON.parse(raw); } catch(e) { console.warn('[loadLocalData] JSON corrompu'); return false; }
    students = p.students || []; validations = p.validations || {}; notes = p.notes || {};
    pfmpData = p.pfmpData || {}; appCfg = p.appCfg || {};
    customCriteria = p.customCriteria || {}; compLocks = p.compLocks || {}; sharedDocs = p.sharedDocs || [];
    window.students = students; window.validations = validations; window.appCfg = appCfg;
    return true;
  }

  function loadLocal() {
    loadLocalData().then(function() {
      try { partenaires = JSON.parse(localStorage.getItem(SPART) || '[]'); } catch(e) { partenaires = []; }
    }).catch(function() {});
  }

  /* ═══ STORAGE INDICATOR ═══ */
  function updateStor() {
    var used = new Blob([localStorage.getItem(SK) || '']).size;
    var el = document.getElementById('storTxt');
    if (el) el.textContent = (used / 1024 / 1024).toFixed(1) + ' MB / 5 MB';
    var f = document.getElementById('storFill');
    if (f) {
      var p = Math.min(used / (5 * 1024 * 1024) * 100, 100);
      f.style.width = p + '%';
      f.className = 'stor-fill' + (p > 80 ? ' danger' : p > 50 ? ' warn' : '');
    }
  }

  /* ═══ UPDATE ALL ═══ */
  function updateAll() {
    if (typeof populateClassFilters === 'function') populateClassFilters();
    if (typeof renderDash === 'function') renderDash();
    if (typeof renderEleves === 'function') renderEleves();
    if (typeof popSelects === 'function') popSelects();
    updateStor();
    if (appCfg.etablissement) {
      var hdr = document.getElementById('hdrEtab');
      if (hdr) hdr.textContent = appCfg.etablissement + ' \u2014 Session ' + (appCfg.session || 2026);
    }
  }

  /* ═══ SYNC ALL ═══ */
  async function syncAll() {
    if (!cfg.apiUrl) { setSyncState('error'); return; }
    setSyncState('syncing');
    try {
      var dash = await apiCall({ action: 'getDashboard' });
      if (!Array.isArray(dash)) throw new Error('invalid');
      students = dash; window.students = students;
      validations = {}; notes = {};
      var BATCH_SIZE = 10;
      for (var i = 0; i < students.length; i += BATCH_SIZE) {
        var batch = students.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async function(s) {
          try {
            var results = await Promise.all([apiCall({ action: 'getValidations', eleve: s.code }), apiCall({ action: 'getNotes', eleve: s.code })]);
            var v = results[0], n = results[1];
            validations[s.code] = Array.isArray(v) ? v : [];
            var e2 = Array.isArray(n) ? n.find(function(x) { return x.epreuve === 'E31'; }) : null;
            var e3 = Array.isArray(n) ? n.find(function(x) { return x.epreuve === 'E32'; }) : null;
            notes[s.code] = { E31: e2 || {}, E32: e3 || {}, E33: (notes[s.code] && notes[s.code].E33) || {} };
          } catch(e) {
            validations[s.code] = validations[s.code] || [];
            notes[s.code] = { E31: {}, E32: {}, E33: (notes[s.code] && notes[s.code].E33) || {} };
          }
        }));
      }
      online = true; saveLocal(); setSyncState('ok'); updateAll();
      toast(students.length + ' eleves synchronises', 'ok');
    } catch(e) {
      online = false; setSyncState('error'); updateAll();
      toast('Hors-ligne \u2014 donnees locales', 'warn');
    }
  }

  /* ═══ PUSH VALIDATION ═══ */
  async function pushVal(data) {
    var entry = Object.assign({}, data, { evaluateur: cfg.nomProf || 'Prof', timestamp: new Date().toISOString(), phase: curPhase });
    if (!validations[cur]) validations[cur] = [];
    validations[cur].push(entry); saveLocal(); toast('\u2713 Enregistre', 'ok');
    if (online) {
      try { await apiCall({ action: 'saveValidation', eleve: cur, data: entry }); } catch(e) { toast('En attente sync', 'warn'); }
    }
  }

  // Exposer sur window
  window.setSyncState = setSyncState;
  window.saveLocal = saveLocal;
  window.saveLocalData = saveLocalData;
  window.loadLocalData = loadLocalData;
  window.loadLocal = loadLocal;
  window.updateStor = updateStor;
  window.updateAll = updateAll;
  window.syncAll = syncAll;
  window.pushVal = pushVal;

})();
