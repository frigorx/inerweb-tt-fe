/**
 * radar.js — Diagrammes radar multi-filière
 * Canvas pur, aucune dépendance externe
 *
 * Fournit :
 *  - Radar individuel par élève (toutes épreuves de sa filière)
 *  - Radar classe (moyenne des compétences par filtre)
 *
 * Globales attendues : students, validations, notes,
 *   FILIERES, getFiliere, getComps, getEpreuves, getLv, NV_PCT
 */
;(function () {
  'use strict';

  var NV_VAL = { NE: 0, NA: 0, EC: 35, M: 70, PM: 100 };
  var PALETTE = [
    { fill: 'rgba(33,150,243,0.15)',  stroke: '#2196F3', point: '#1565C0' },  // bleu
    { fill: 'rgba(255,107,53,0.15)',   stroke: '#FF6B35', point: '#c0390f' },  // orange
    { fill: 'rgba(142,68,173,0.15)',   stroke: '#8e44ad', point: '#6c3483' },  // violet
    { fill: 'rgba(39,174,96,0.15)',    stroke: '#27ae60', point: '#1a7d3e' },  // vert
    { fill: 'rgba(22,160,133,0.15)',   stroke: '#16a085', point: '#0d6b56' },  // teal
  ];
  var CLASS_COLOR = { fill: 'rgba(255,152,0,0.18)', stroke: '#FF9800', point: '#E65100' };
  var ELEVE_COLOR = { fill: 'rgba(33,150,243,0.18)', stroke: '#2196F3', point: '#1565C0' };

  /* ═══════════════════════════════════════════════
   * DESSIN RADAR GÉNÉRIQUE
   * ═══════════════════════════════════════════════ */
  function _drawRadar(canvasId, labels, datasets, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.width, H = canvas.height;
    var cx = W / (2 * dpr), cy = H / (2 * dpr);
    // HiDPI
    if (!canvas._scaled) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);
      canvas._scaled = true;
    }
    W = parseInt(canvas.style.width);
    H = parseInt(canvas.style.height);
    cx = W / 2; cy = H / 2;
    var R = Math.min(cx, cy) - 36;
    var n = labels.length;
    if (n < 3) return;

    ctx.clearRect(0, 0, W * dpr, H * dpr);

    // Titre
    if (opts && opts.title) {
      ctx.fillStyle = '#1a2332';
      ctx.font = 'bold 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(opts.title, cx, 16);
    }

    var offy = (opts && opts.title) ? 14 : 0;
    cy += offy / 2;

    // Grille concentrique
    [0.25, 0.5, 0.75, 1].forEach(function(pct) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var x = cx + R * pct * Math.cos(angle);
        var y = cy + R * pct * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Axes + labels
    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.stroke();

      var lx = cx + (R + 20) * Math.cos(angle);
      var ly = cy + (R + 20) * Math.sin(angle);
      ctx.fillStyle = '#444';
      ctx.font = '600 9px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], lx, ly);
    }

    // Niveaux sur l'axe vertical
    ctx.fillStyle = '#bbb';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    [25, 50, 75, 100].forEach(function(v, idx) {
      var pct = [0.25, 0.5, 0.75, 1][idx];
      ctx.fillText(v + '%', cx - 4, cy - R * pct + 3);
    });

    // Datasets
    datasets.forEach(function(ds) {
      ctx.beginPath();
      ds.values.forEach(function(v, i) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var r = R * (v / 100);
        var x = cx + r * Math.cos(angle);
        var y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = ds.color.fill;
      ctx.fill();
      ctx.strokeStyle = ds.color.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Points
      ds.values.forEach(function(v, i) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var r = R * (v / 100);
        var x = cx + r * Math.cos(angle);
        var y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = ds.color.point;
        ctx.fill();
      });
    });

    // Légende
    var legY = H - 8;
    var legX = 10;
    datasets.forEach(function(ds) {
      ctx.fillStyle = ds.color.stroke;
      ctx.fillRect(legX, legY - 4, 8, 8);
      ctx.fillStyle = '#333';
      ctx.font = '600 9px Nunito, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label, legX + 11, legY + 3);
      legX += ctx.measureText(ds.label).width + 26;
    });
  }

  /* ═══════════════════════════════════════════════
   * HELPERS
   * ═══════════════════════════════════════════════ */
  function _getStudentComps(studentCode) {
    var s = (window.students || []).find(function(x) { return x.code === studentCode; });
    if (!s) return null;
    var filKey = window.getFiliere ? window.getFiliere(s) : 'BAC_MFER';
    var fil = window.FILIERES ? window.FILIERES[filKey] : null;
    if (!fil) return null;
    return { student: s, filKey: filKey, fil: fil };
  }

  function _compValue(studentCode, ep, compCode) {
    var lv = window.getLv ? window.getLv(studentCode, ep, compCode) : null;
    return NV_VAL[lv || 'NE'] || 0;
  }

  /* ═══════════════════════════════════════════════
   * RADAR ÉLÈVE — toutes épreuves de sa filière
   * ═══════════════════════════════════════════════ */
  function renderStudentRadar(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var info = _getStudentComps(studentCode);
    if (!info) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.78rem;padding:1rem">Aucune donnée</div>'; return; }

    var epreuves = Object.keys(info.fil.comps);
    if (!epreuves.length) return;

    // Construire les labels (toutes compétences de toutes épreuves)
    var allComps = [];
    var epMap = {}; // comp.code → épreuve
    epreuves.forEach(function(ep) {
      var comps = info.fil.comps[ep] || [];
      comps.forEach(function(c) {
        if (!epMap[c.code]) {
          allComps.push(c);
          epMap[c.code] = ep;
        }
      });
    });

    if (allComps.length < 3) return;

    var canvasId = 'radar_elv_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
    var w = Math.min(el.offsetWidth || 340, 380);
    var h = w;

    el.innerHTML = '<canvas id="' + canvasId + '" width="' + w + '" height="' + h + '" style="max-width:100%;display:block;margin:0 auto"></canvas>';

    var labels = allComps.map(function(c) { return c.code; });
    var values = allComps.map(function(c) { return _compValue(studentCode, epMap[c.code], c.code); });

    // Dataset unique : profil élève
    var datasets = [{ label: info.student.nom + ' ' + (info.student.prenom || ''), values: values, color: ELEVE_COLOR }];

    var title = info.fil.abrege + ' — Profil compétences';
    setTimeout(function() { _drawRadar(canvasId, labels, datasets, { title: title }); }, 60);
  }

  /* ═══════════════════════════════════════════════
   * RADAR ÉLÈVE PAR ÉPREUVE (un radar par EP)
   * ═══════════════════════════════════════════════ */
  function renderStudentRadarByEp(studentCode, ep, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var info = _getStudentComps(studentCode);
    if (!info) return;

    var comps = info.fil.comps[ep] || [];
    if (comps.length < 3) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.75rem">Pas assez de compétences pour un radar</div>'; return; }

    var canvasId = 'radar_' + ep + '_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
    var w = Math.min(el.offsetWidth || 300, 340);

    el.innerHTML = '<canvas id="' + canvasId + '" width="' + w + '" height="' + w + '" style="max-width:100%;display:block;margin:0 auto"></canvas>';

    var labels = comps.map(function(c) { return c.code; });

    // Valeurs formatif
    var formatifValues = comps.map(function(c) {
      var entries = (window.validations[studentCode] || []).filter(function(v) {
        return v.epreuve === ep && v.competence === c.code && (!v.critere || v.critere === '') && v.phase === 'formatif';
      });
      if (!entries.length) return 0;
      entries.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
      return NV_VAL[entries[0].niveau] || 0;
    });

    // Valeurs certificatif
    var certifValues = comps.map(function(c) {
      var entries = (window.validations[studentCode] || []).filter(function(v) {
        return v.epreuve === ep && v.competence === c.code && (!v.critere || v.critere === '') && v.phase === 'certificatif';
      });
      if (!entries.length) return 0;
      entries.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
      return NV_VAL[entries[0].niveau] || 0;
    });

    var datasets = [];
    var hasF = formatifValues.some(function(v) { return v > 0; });
    var hasC = certifValues.some(function(v) { return v > 0; });

    if (hasF && hasC) {
      datasets.push({ label: 'Formatif', values: formatifValues, color: PALETTE[0] });
      datasets.push({ label: 'Certificatif', values: certifValues, color: PALETTE[1] });
    } else {
      var vals = comps.map(function(c) { return _compValue(studentCode, ep, c.code); });
      var col = hasC ? PALETTE[1] : PALETTE[0];
      datasets.push({ label: hasC ? 'Certificatif' : 'Progression', values: vals, color: col });
    }

    setTimeout(function() { _drawRadar(canvasId, labels, datasets, { title: ep }); }, 60);
  }

  /* ═══════════════════════════════════════════════
   * RADAR CLASSE — moyenne de la classe
   * ═══════════════════════════════════════════════ */
  function renderClassRadar(container, filterOpts) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var sts = window.students || [];
    if (!sts.length) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">Aucun élève</div>'; return; }

    // Filtrer les élèves
    var opts = filterOpts || {};
    var filtered = sts.filter(function(s) {
      if (opts.classe && opts.classe !== 'all' && s.classe !== opts.classe) return false;
      if (opts.annee && opts.annee !== 'all' && String(s.annee || 1) !== opts.annee) return false;
      if (opts.groupe && opts.groupe !== 'all' && (s.groupe || '') !== opts.groupe) return false;
      return true;
    });

    if (!filtered.length) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">Aucun élève pour ce filtre</div>'; return; }

    // Grouper par filière
    var byFil = {};
    filtered.forEach(function(s) {
      var fk = window.getFiliere ? window.getFiliere(s) : 'BAC_MFER';
      if (!byFil[fk]) byFil[fk] = [];
      byFil[fk].push(s);
    });

    var filKeys = Object.keys(byFil);
    var html = '';

    filKeys.forEach(function(fk, fIdx) {
      var fil = window.FILIERES ? window.FILIERES[fk] : null;
      if (!fil) return;
      var group = byFil[fk];
      var epreuves = Object.keys(fil.comps);

      epreuves.forEach(function(ep, eIdx) {
        var comps = fil.comps[ep] || [];
        if (comps.length < 3) return;

        var cid = 'radar_class_' + fk + '_' + ep;
        var w = Math.min((el.offsetWidth || 340) / Math.min(epreuves.length, 2) - 10, 340);
        w = Math.max(w, 240);

        html += '<div style="display:inline-block;vertical-align:top;margin:.25rem">'
          + '<canvas id="' + cid + '" width="' + w + '" height="' + w + '" style="max-width:100%;display:block"></canvas>'
          + '</div>';
      });
    });

    el.innerHTML = html || '<div style="text-align:center;color:#999;font-size:.8rem;padding:1rem">Pas assez de données</div>';

    // Dessiner chaque radar après insertion DOM
    setTimeout(function() {
      filKeys.forEach(function(fk, fIdx) {
        var fil = window.FILIERES ? window.FILIERES[fk] : null;
        if (!fil) return;
        var group = byFil[fk];
        var epreuves = Object.keys(fil.comps);

        epreuves.forEach(function(ep) {
          var comps = fil.comps[ep] || [];
          if (comps.length < 3) return;
          var cid = 'radar_class_' + fk + '_' + ep;

          var labels = comps.map(function(c) { return c.code; });

          // Moyenne de la classe
          var avgValues = comps.map(function(c) {
            var sum = 0;
            group.forEach(function(s) { sum += _compValue(s.code, ep, c.code); });
            return Math.round(sum / group.length);
          });

          var datasets = [{
            label: (fil.abrege || fk) + ' — Moyenne (' + group.length + ' élèves)',
            values: avgValues,
            color: PALETTE[fIdx % PALETTE.length]
          }];

          _drawRadar(cid, labels, datasets, { title: (fil.abrege || fk) + ' — ' + ep });
        });
      });
    }, 80);
  }

  /* ═══════════════════════════════════════════════
   * RADAR COMPARAISON ÉLÈVE vs CLASSE
   * ═══════════════════════════════════════════════ */
  function renderCompareRadar(studentCode, container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var info = _getStudentComps(studentCode);
    if (!info) { el.innerHTML = ''; return; }

    // Élèves de la même classe
    var classMates = (window.students || []).filter(function(s) {
      return s.classe === info.student.classe;
    });
    if (classMates.length < 2) { el.innerHTML = ''; return; }

    var epreuves = Object.keys(info.fil.comps);
    var html = '';

    epreuves.forEach(function(ep) {
      var comps = info.fil.comps[ep] || [];
      if (comps.length < 3) return;
      var cid = 'radar_cmp_' + ep + '_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
      var w = Math.min(el.offsetWidth || 340, 360);
      html += '<canvas id="' + cid + '" width="' + w + '" height="' + w + '" style="max-width:100%;display:block;margin:.5rem auto"></canvas>';
    });

    el.innerHTML = html;

    setTimeout(function() {
      epreuves.forEach(function(ep) {
        var comps = info.fil.comps[ep] || [];
        if (comps.length < 3) return;
        var cid = 'radar_cmp_' + ep + '_' + studentCode.replace(/[^a-zA-Z0-9]/g, '');
        var labels = comps.map(function(c) { return c.code; });

        // Valeurs élève
        var elvValues = comps.map(function(c) { return _compValue(studentCode, ep, c.code); });

        // Moyenne classe
        var avgValues = comps.map(function(c) {
          var sum = 0;
          classMates.forEach(function(s) { sum += _compValue(s.code, ep, c.code); });
          return Math.round(sum / classMates.length);
        });

        var datasets = [
          { label: info.student.nom + ' ' + (info.student.prenom || ''), values: elvValues, color: ELEVE_COLOR },
          { label: 'Moyenne classe (' + classMates.length + ')', values: avgValues, color: CLASS_COLOR }
        ];

        _drawRadar(cid, labels, datasets, { title: ep + ' — Élève vs Classe' });
      });
    }, 80);
  }

  /* ═══════════════════════════════════════════════
   * EXPOSITION GLOBALE
   * ═══════════════════════════════════════════════ */
  window.radarModule = {
    renderStudentRadar: renderStudentRadar,
    renderStudentRadarByEp: renderStudentRadarByEp,
    renderClassRadar: renderClassRadar,
    renderCompareRadar: renderCompareRadar,
    // Rétrocompatibilité
    renderBothRadars: function(code, container) { renderStudentRadar(code, container); }
  };

})();
