/**
 * api.js — Appels API centralises
 * Extrait de inerweb_prof.html [C] CORE
 * Expose : window.apiCall, window.cleanUrl, window.DEFAULT_CFG, window.WRITE_ACTIONS
 */
;(function(){
  'use strict';

  var DEFAULT_CFG = {
    apiUrl: 'https://script.google.com/macros/s/AKfycbzEbzLo57x0u0k2wjAzyLdZ42iVZdHdOwmPd5Ioe6fjApuSftuSckZ9svKpajbyjEuhVg/exec',
    apiKey: '',
    nomProf: '',
    baseUrl: 'https://frigorx.github.io/inerweb-tt-fe/'
  };

  var WRITE_ACTIONS = ['saveValidation','addEleve','deleteEleve','cloturerEpreuve','addJournalEntry','saveConfig','addUser','deleteUser'];

  function cleanUrl(raw) {
    raw = raw.replace(/\s+/g, '').trim();
    // Extraire la DERNIERE URL valide (au cas ou concatenation)
    var all = [].concat(Array.from(raw.matchAll(/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g)));
    if (all.length > 0) return 'https://' + all[all.length - 1][0];
    // Fallback: extraire l'ID de deploiement
    var id = raw.match(/AKfycb[A-Za-z0-9_-]+/);
    if (id) return 'https://script.google.com/macros/s/' + id[0] + '/exec';
    raw = raw.replace(/^(https?:\/\/|script\.\w+\/\/|https?\/\/)/i, '');
    return 'https://' + raw;
  }

  async function apiCall(params) {
    if (!cfg.apiUrl) throw new Error('no url');
    params.key = cfg.apiKey;
    var isWrite = WRITE_ACTIONS.includes(params.action);
    var r;
    if (isWrite) {
      // POST pour les ecritures (cle + donnees dans le body, pas dans l'URL)
      var url = new URL(cfg.apiUrl);
      url.searchParams.set('action', params.action);
      var body = { key: params.key };
      Object.entries(params).forEach(function([k, v]) { if (k !== 'action' && k !== 'key') body[k] = v; });
      r = await fetch(url.toString(), { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
    } else {
      // GET pour les lectures
      var url2 = new URL(cfg.apiUrl);
      Object.entries(params).forEach(function([k, v]) { url2.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v); });
      r = await fetch(url2.toString(), { method: 'GET', redirect: 'follow' });
    }
    var d = await r.json();
    if (d.error && d.code === 403) throw new Error('Acces refuse');
    if (d.error) throw new Error(d.error);
    return d;
  }

  // Exposer sur window
  window.apiCall = apiCall;
  window.cleanUrl = cleanUrl;
  window.DEFAULT_CFG = DEFAULT_CFG;
  window.WRITE_ACTIONS = WRITE_ACTIONS;

})();
