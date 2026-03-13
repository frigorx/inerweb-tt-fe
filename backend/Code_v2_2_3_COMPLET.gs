/**
 * ═══════════════════════════════════════════════════
 * inerWeb Édu — Google Apps Script Backend v2.2.3
 * Base v2.1.1 (Event-Sourcing) + Module Copilote IA
 * Audit final round 2 : corrections P1 (GPT + Gemini)
 * ═══════════════════════════════════════════════════
 * 
 * DÉPLOIEMENT :
 * 1. Créer un Google Sheet → copier son ID
 * 2. Ouvrir Extensions > Apps Script
 * 3. Coller CE FICHIER dans Code.gs
 * 4. Remplacer VOTRE_SPREADSHEET_ID_ICI par l'ID du Sheet
 * 5. Propriétés du script : ajouter API_KEY et GEMINI_API_KEY
 * 6. Exécuter setupSpreadsheet() puis populateDemoSeances()
 * 7. Déployer > Nouveau déploiement > Application Web
 */

// ── Configuration ──────────────────────────────
const CONFIG = {
  SPREADSHEET_ID: 'VOTRE_SPREADSHEET_ID_ICI', // ← À REMPLACER !
  ADMIN_EMAIL: 'franck.henninot@campus-equatio.fr',
  GEMINI_QUOTA_MENSUEL: 50,
  VERSION: '2.2.3',
};

const TABS = {
  EVENT_LOG: 'EventLog',
  SEANCES: 'Séances',
  SEQUENCES: 'Séquences',
  ELEVES: 'Élèves',
  EVALUATIONS: 'Évaluations',
  CALENDRIER_CFA: 'Calendrier CFA',
  ENSEIGNANTS: 'Enseignants',
  LOGS_IA: 'Logs IA',
  CONFIG: 'Config',
};

// Colonnes de l'onglet Séances
const SC = { ID:1, CLASSE:2, DATE:3, HORAIRE:4, TYPE:5, SEQ_ID:6, SEQ_NOM:7, CONTENU:8, COMPS:9, ENSEIGNANT:10, STATUT:11, DATE_VALID:12 };


// ══════════════════════════════════════════════════
// POINT D'ENTRÉE API — GET & POST
// ══════════════════════════════════════════════════

function doGet(e) {
  if (!checkApiKey(e.parameter.key)) return jsonResp({ error: '⛔ Accès refusé : Clé API invalide' });

  const action = e.parameter.action || '';
  const enseignant = e.parameter.enseignant || '';
  let result;

  try {
    switch (action) {
      case 'ping':
        result = { status: 'ok', version: CONFIG.VERSION, timestamp: isoParis_(new Date()) };
        break;
      case 'getSeances':
        result = getSeances(enseignant, e.parameter);
        break;
      case 'getSeancesSemaine':
        result = getSeancesSemaine(enseignant, e.parameter.weekStart);
        break;
      case 'getEvents':
        result = getEventsFromSheet(enseignant, parseInt(e.parameter.limit) || 50);
        break;
      case 'getEleves':
        result = getEleves(e.parameter.classe);
        break;
      default:
        result = { error: 'Action inconnue: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResp(result);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResp({ error: 'JSON invalide' });
  }

  const key = (e.parameter && e.parameter.key) || body.apiKey || '';
  if (!checkApiKey(key)) return jsonResp({ error: '⛔ Accès refusé : Clé API invalide' });

  let result;
  try {
    switch (body.action) {
      case 'pushEvents':
        result = pushEvents(body.events || []);
        break;
      case 'enrichirTexteED':
        result = enrichirTexteED(body.seanceId, body.enseignant);
        break;
      case 'askCopilot':
        result = askCopilot(body.texte, body.enseignant, body.style);
        break;
      default:
        result = { error: 'Action POST inconnue: ' + body.action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResp(result);
}

function jsonResp(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function checkApiKey(receivedKey) {
  const realKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!realKey) {
    // FAIL-CLOSED : si pas de clé configurée côté serveur → tout est bloqué
    // Ça évite qu'un oubli de configuration expose l'API à internet
    Logger.log('⛔ API_KEY non configurée dans les propriétés du script. Accès refusé.');
    return false;
  }
  return receivedKey === realKey;
}


// ══════════════════════════════════════════════════
// CORE : SYNC & EVENT LOG (Sécurisé)
// ══════════════════════════════════════════════════

function pushEvents(events) {
  if (!events || events.length === 0) return { received: 0, written: 0 };

  // GARDE-FOU VOLUMÉTRIE : max 50 events par appel (anti-spam / anti-timeout)
  if (events.length > 50) {
    return { error: 'Maximum 50 événements par appel. Reçu : ' + events.length };
  }

  // WHITELIST : seuls les types reconnus sont acceptés dans l'EventLog
  const TYPES_AUTORISES = ['seance.validee','seance.invalidee','seance.annulee','seance.creee','competence.evaluee'];
  const eventsClean = events.filter(e => TYPES_AUTORISES.includes(e.type));
  const rejected = events.length - eventsClean.length;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { error: '⚠️ Serveur occupé, réessayez dans quelques secondes.' };
  }

  try {
    const sheet = getOrCreateSheet(TABS.EVENT_LOG, ['eventId','timestamp','type','acteur','cible','donnees','source']);

    const existingIds = new Set();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const idsData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idsData.length; i++) existingIds.add(idsData[i][0]);
    }

    const newRows = [];
    const projectionUpdates = [];
    let duplicates = 0;
    let rejectedMalformed = 0;

    for (const evt of eventsClean) {
      // GARDE-FOU : eventId obligatoire (sinon idempotence cassée)
      if (!evt || !evt.eventId || !String(evt.eventId).trim()) { rejectedMalformed++; continue; }

      if (existingIds.has(evt.eventId)) { duplicates++; continue; }

      // Timestamp défensif : si absent, on met maintenant
      if (!evt.timestamp) evt.timestamp = isoParis_(new Date());

      // SANITIZE donnees : garantir un JSON valide (anti log-poisoning)
      let jsonDonnees = '{}';
      if (typeof evt.donnees === 'string') {
        try { JSON.parse(evt.donnees); jsonDonnees = evt.donnees; }
        catch (e) { rejectedMalformed++; continue; } // donnees non-JSON → rejet
      } else {
        jsonDonnees = JSON.stringify(evt.donnees || {});
      }

      newRows.push([evt.eventId, evt.timestamp, evt.type, evt.acteur, evt.cible, jsonDonnees, evt.source || 'pwa']);
      existingIds.add(evt.eventId);
      projectionUpdates.push(evt);
    }

    if (newRows.length > 0) {
      sheet.getRange(lastRow + 1, 1, newRows.length, 7).setValues(newRows);
    }

    if (projectionUpdates.length > 0) {
      updateProjections(projectionUpdates);
    }

    return { received: events.length, written: newRows.length, duplicates: duplicates, rejected: rejected, rejectedMalformed: rejectedMalformed };
  } catch (err) {
    Logger.log('Erreur pushEvents: ' + err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}


// ══════════════════════════════════════════════════
// PROJECTIONS (Vues matérialisées)
// ══════════════════════════════════════════════════

function updateProjections(events) {
  for (const evt of events) {
    if (evt.type === 'seance.validee') updateSeanceStatut(evt.cible, 'validee', evt.timestamp);
    else if (evt.type === 'seance.invalidee') updateSeanceStatut(evt.cible, 'pending', '');
    else if (evt.type === 'seance.creee') createSeanceFromEvent(evt);
    else if (evt.type === 'competence.evaluee') updateEvaluation(evt);
  }
}

function updateSeanceStatut(seanceId, statut, dateVal) {
  const sheet = getSheet(TABS.SEANCES);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === seanceId) {
      sheet.getRange(i + 1, SC.STATUT).setValue(statut);
      sheet.getRange(i + 1, SC.DATE_VALID).setValue(dateVal);
      return;
    }
  }
}

function createSeanceFromEvent(evt) {
  const sheet = getOrCreateSheet(TABS.SEANCES);
  const d = evt.donnees || {};
  sheet.appendRow([
    evt.cible,
    d.classe || '',
    evt.timestamp.slice(0, 10),
    d.horaire || '',
    'oneshot',
    d.sequenceId || 'OS',
    d.sequenceNom || 'Intervention ponctuelle',
    d.contenu || '',
    (d.competences || []).join(' ; '),
    evt.acteur,
    'pending',
    ''
  ]);
}

function updateEvaluation(evt) {
  const sheet = getOrCreateSheet(TABS.EVALUATIONS, ['eleveId','competenceCode','niveau','seanceId','enseignant','timestamp']);
  const d = evt.donnees || {};

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === evt.cible && data[i][1] === d.competenceCode && data[i][3] === d.seanceId) {
      // Comparaison robuste : convertir en millisecondes (gère Date natif et ISO strings)
      const existingRaw = data[i][5];
      const existingMs = existingRaw instanceof Date ? existingRaw.getTime() : new Date(String(existingRaw || 0)).getTime();
      const incomingMs = new Date(String(evt.timestamp)).getTime();
      if (existingMs && incomingMs && incomingMs <= existingMs) return; // Ancien event → on ignore
      sheet.getRange(i + 1, 3).setValue(d.niveau);
      sheet.getRange(i + 1, 6).setValue(evt.timestamp);
      return;
    }
  }
  sheet.appendRow([evt.cible, d.competenceCode, d.niveau, d.seanceId, evt.acteur, evt.timestamp]);
}


// ══════════════════════════════════════════════════
// LECTURE (GET)
// ══════════════════════════════════════════════════

function getSeances(enseignant, params) {
  const sheet = getSheet(TABS.SEANCES);
  if (!sheet) return { seances: [] };

  const data = sheet.getDataRange().getValues();
  const seances = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (enseignant && row[SC.ENSEIGNANT - 1] !== enseignant) continue;

    let dateStr = '';
    if (row[SC.DATE - 1] instanceof Date) {
      dateStr = Utilities.formatDate(row[SC.DATE - 1], 'Europe/Paris', 'yyyy-MM-dd');
    } else {
      dateStr = String(row[SC.DATE - 1]).substring(0, 10);
    }

    if (params.dateDebut && dateStr < params.dateDebut) continue;
    if (params.dateFin && dateStr > params.dateFin) continue;

    seances.push({
      id: row[SC.ID - 1],
      classe: row[SC.CLASSE - 1],
      date: dateStr,
      horaire: row[SC.HORAIRE - 1],
      type: row[SC.TYPE - 1],
      sequenceId: row[SC.SEQ_ID - 1],
      sequenceNom: row[SC.SEQ_NOM - 1],
      contenu: row[SC.CONTENU - 1],
      competences: (row[SC.COMPS - 1] || '').split(';').map(c => c.trim()).filter(Boolean),
      enseignant: row[SC.ENSEIGNANT - 1],
      statut: row[SC.STATUT - 1] || 'pending',
      dateValidation: row[SC.DATE_VALID - 1]
    });
  }
  return { seances };
}

function getSeancesSemaine(enseignant, weekStart) {
  if (!weekStart) weekStart = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  const weekEnd = Utilities.formatDate(d, 'Europe/Paris', 'yyyy-MM-dd');
  return getSeances(enseignant, { dateDebut: weekStart, dateFin: weekEnd });
}

function getEventsFromSheet(enseignant, limit) {
  const sheet = getSheet(TABS.EVENT_LOG);
  if (!sheet) return { events: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { events: [] };

  const startRow = Math.max(2, lastRow - limit + 1);
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 7).getValues();

  const events = data.map(row => {
    let donnees = {};
    if (row[5]) {
      try { donnees = typeof row[5] === 'string' ? JSON.parse(row[5]) : row[5]; }
      catch (e) { donnees = {}; } // Event corrompu → on ignore les données
    }
    return {
      eventId: row[0], timestamp: row[1], type: row[2], acteur: row[3],
      cible: row[4], donnees: donnees, source: row[6], synced: true
    };
  });

  return { events: enseignant ? events.filter(e => e.acteur === enseignant) : events };
}

function getEleves(classe) {
  const sheet = getSheet(TABS.ELEVES);
  if (!sheet) return { eleves: [] };
  const data = sheet.getDataRange().getValues();
  const eleves = [];
  for (let i = 1; i < data.length; i++) {
    if (classe && data[i][1] !== classe) continue;
    eleves.push({ id: data[i][0], classe: data[i][1], code: data[i][2], groupe: data[i][3] });
  }
  return { eleves };
}


// ══════════════════════════════════════════════════
// IA — Niveau 1 : Gemini Flash (enrichissement texte ÉD)
// ══════════════════════════════════════════════════

function enrichirTexteED(seanceId, enseignant) {
  if (!checkGeminiQuota(enseignant)) return { error: 'Quota Gemini atteint' };

  const sheet = getSheet(TABS.SEANCES);
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === seanceId);
  if (!row) return { error: 'Séance introuvable' };

  const prompt = 'Contexte: Lycée pro Froid/Climatisation.\n' +
    'Tâche: Rédiger un texte de cahier de texte (3 lignes max) pro et précis.\n' +
    'Classe: ' + row[1] + ' | Séquence: ' + row[6] + '\n' +
    'Contenu brut: ' + row[7] + '\n' +
    'Compétences: ' + row[8] + '\n' +
    'Format: Brut, sans markdown.';

  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Clé API Gemini manquante');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    const resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      muteHttpExceptions: true
    });

    const respData = JSON.parse(resp.getContentText());
    const text = respData && respData.candidates && respData.candidates[0] &&
                 respData.candidates[0].content && respData.candidates[0].content.parts &&
                 respData.candidates[0].content.parts[0] && respData.candidates[0].content.parts[0].text;
    if (!text) return { error: 'Réponse Gemini vide ou filtrée.' };
    logIACall(enseignant, 'gemini', 'enrichir_ed', prompt.length + text.length, hashString(prompt));

    return { success: true, texte: text };
  } catch (e) {
    return { error: 'Erreur IA: ' + e.message };
  }
}

function checkGeminiQuota(enseignant) {
  const sheet = getSheet(TABS.LOGS_IA);
  if (!sheet) return true;

  const data = sheet.getDataRange().getValues();
  const moisCourant = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM');
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === enseignant && data[i][1] === 'gemini' && data[i][2]) {
      const mois = Utilities.formatDate(new Date(data[i][2]), 'Europe/Paris', 'yyyy-MM');
      if (mois === moisCourant) count++;
    }
  }

  return count < CONFIG.GEMINI_QUOTA_MENSUEL;
}

function logIACall(user, service, type, tokens, hash) {
  const sheet = getOrCreateSheet(TABS.LOGS_IA, ['Enseignant','Service','Date','Type','Tokens','Coût','Hash']);
  sheet.appendRow([user, service, new Date(), type, tokens, 0, hash || '']);
}

function hashString(str) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').slice(0, 16);
}


// ══════════════════════════════════════════════════════════════════
// MODULE COPILOTE IA — V1.1 DURCI (Event-Sourcing)
// Synthèse des audits Claude × GPT × Gemini
// ══════════════════════════════════════════════════════════════════

// ── BRIQUE A : Contrat strict ──

const COPILOT_ALLOWED_ACTIONS = [
  'seance.validee',
  'seance.invalidee',
  'seance.annulee',
  'seance.creee',
  'competence.evaluee',
];

const COPILOT_FORCE_CONFIRM = [
  'seance.annulee',
  'seance.creee',
];

const SCHEMA_COPILOTE = {
  type: "OBJECT",
  properties: {
    message_vocal: {
      type: "STRING",
      description: "Réponse courte et directe à l'enseignant (1-2 phrases max)."
    },
    confirmation_requise: {
      type: "BOOLEAN",
      description: "true si ambigu, info manquante, ou enjeu CCF/annulation/création."
    },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: COPILOT_ALLOWED_ACTIONS },
          cible: { type: "STRING", description: "ID stable (sea-... ou elv-...)" },
          donnees: { type: "OBJECT", description: "Données selon le type" }
        },
        required: ["type", "cible"]
      }
    }
  },
  required: ["message_vocal", "confirmation_requise", "actions"]
};

// ── BRIQUE B : Moteur déterministe ──

function parseHeureEnMinutes_(heure) {
  if (!heure) return 0;
  const parts = String(heure).match(/(\d{1,2}):(\d{2})/);
  if (!parts) return 0;
  return parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

function parseHoraireBornes_(horaire) {
  if (!horaire) return null;
  const parts = String(horaire).match(/(\d{1,2}:\d{2})\s*[–\-—]\s*(\d{1,2}:\d{2})/);
  if (!parts) return null;
  return { debut: parseHeureEnMinutes_(parts[1]), fin: parseHeureEnMinutes_(parts[2]) };
}

function resolveSeanceCible_(seancesDuJour, heureActuelle) {
  const pending = seancesDuJour.filter(s => s.statut !== 'validee' && s.statut !== 'done');
  if (pending.length === 0) return null;

  const nowMin = parseHeureEnMinutes_(heureActuelle);

  for (const s of pending) {
    const bornes = parseHoraireBornes_(s.horaire);
    if (bornes && nowMin >= bornes.debut && nowMin <= bornes.fin) return s;
  }

  let meilleure = null, meilleureEcart = Infinity;
  for (const s of pending) {
    const bornes = parseHoraireBornes_(s.horaire);
    if (bornes && nowMin > bornes.fin) {
      const ecart = nowMin - bornes.fin;
      if (ecart <= 30 && ecart < meilleureEcart) { meilleure = s; meilleureEcart = ecart; }
    }
  }
  if (meilleure) return meilleure;

  if (pending.length === 1) return pending[0];
  return null;
}

function genererTexteED_v2_(seance) {
  let texte = '';
  if (seance.sequenceNom) texte += '📚 ' + seance.sequenceNom + '\n\n';
  if (seance.contenu) texte += seance.contenu + '\n\n';
  else texte += 'Séance réalisée conformément à la progression.\n\n';
  const comps = Array.isArray(seance.competences) ? seance.competences.join(' ; ') : (seance.competences || '');
  if (comps) texte += 'Compétences travaillées : ' + comps + '\n';
  return texte.trim();
}

function checkSeuilCCF_(eleveId, competenceCode) {
  const sheet = getSheet(TABS.EVENT_LOG);
  if (!sheet) return { count: 0, seuil: false, proche: false };
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { count: 0, seuil: false, proche: false };

  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i][2] === 'competence.evaluee' && data[i][4] === eleveId) {
      try {
        const donnees = typeof data[i][5] === 'string' ? JSON.parse(data[i][5]) : data[i][5];
        if (donnees && donnees.competenceCode === competenceCode && parseInt(donnees.niveau) >= 3) count++;
      } catch (e) { /* ignore */ }
    }
  }
  return { count, seuil: count >= 3, proche: count === 2 };
}


// ── BRIQUE C : Prompt Master + Endpoint ──

const PROMPT_MASTER = `Tu es inerWeb, le copilote pédagogique d'un enseignant en froid & climatisation.

STYLE :
- Respecte le style indiqué dans le contexte (tutoiement ou vouvoiement).
- Réponse COURTE (1-2 phrases max). Jamais de blabla.

RÔLE STRICT :
Tu traduis le langage naturel en intentions d'actions JSON.
Tu N'ES PAS la source de vérité. Le système l'est. Tu PROPOSES, tu ne DÉCIDES jamais.
L'enseignant a PRÉ-ANONYMISÉ les prénoms en codes (elv-xxx) avant de t'envoyer sa demande.

RÈGLES ABSOLUES :
1. N'invente JAMAIS un ID. Utilise UNIQUEMENT ceux du CONTEXTE_JSON.
2. Si ambigu ou info manquante → confirmation_requise: true, actions: [], et pose une question claire.
3. Actions autorisées : seance.validee, seance.invalidee, seance.annulee, seance.creee, competence.evaluee.
4. Pour seance.annulee et seance.creee → TOUJOURS confirmation_requise: true.
5. Pour competence.evaluee → donnees DOIT contenir competenceCode, niveau (1-4, NE, ABS), et seanceId.
6. Si seance_cible_probable existe, utilise-la pour "C'est fait" / "Valide".
7. Fuseau horaire : Europe/Paris.

VOCABULAIRE MÉTIER :
- "C'est fait" / "C'est bon" / "Validé" / "OK" → seance.validee
- "Annule" / "Ils sont pas venus" / "Grève" → seance.annulee (+ motif)
- "Mets un 3" / "Il a bien bossé" → competence.evaluee
- "le froid" / "le brasage" / "la PAC" / "le vide" → chercher dans les séquences du contexte`;


function askCopilot(texteVocal, enseignantId, styleOverride) {
  if (!texteVocal || !enseignantId) {
    return { message: 'Paramètres manquants.', confirmation_requise: true, actions_executees: 0 };
  }

  if (!checkGeminiQuota(enseignantId)) {
    return { message: 'Quota IA épuisé ce mois-ci.', confirmation_requise: true, actions_executees: 0 };
  }

  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { message: 'Clé GEMINI_API_KEY manquante.', confirmation_requise: true, actions_executees: 0 };
  }

  const style = styleOverride || { pronom: 'tu', ton: 'direct' };
  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Europe/Paris', 'yyyy-MM-dd');
  const heureActuelle = Utilities.formatDate(now, 'Europe/Paris', 'HH:mm');

  const toutesSeances = getSeances(enseignantId, { dateDebut: dateStr, dateFin: dateStr }).seances || [];

  // RGPD : seuls les élèves des classes du jour
  const classesDuJour = [...new Set(toutesSeances.map(s => s.classe))];
  let elevesFiltered = [];
  for (const cls of classesDuJour) {
    const res = getEleves(cls);
    if (res.eleves) elevesFiltered = elevesFiltered.concat(res.eleves);
  }

  const seanceIds = new Set(toutesSeances.map(s => s.id));
  const eleveIds = new Set(elevesFiltered.map(e => e.id));
  const seanceCible = resolveSeanceCible_(toutesSeances, heureActuelle);

  const contexteObj = {
    date: dateStr, heure: heureActuelle, timezone: 'Europe/Paris', style: style,
    seance_cible_probable: seanceCible ? {
      id: seanceCible.id, classe: seanceCible.classe, horaire: seanceCible.horaire,
      sequenceNom: seanceCible.sequenceNom, contenu: seanceCible.contenu, competences: seanceCible.competences,
    } : null,
    seances_du_jour: toutesSeances.map(s => ({
      id: s.id, classe: s.classe, horaire: s.horaire, type: s.type,
      sequenceNom: s.sequenceNom, contenu: s.contenu, competences: s.competences, statut: s.statut,
    })),
    eleves: elevesFiltered.map(e => ({ id: e.id, classe: e.classe, groupe: e.groupe })),
  };

  // Appel Gemini
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  const payload = {
    systemInstruction: { parts: [{ text: PROMPT_MASTER }] },
    contents: [{ parts: [{ text: 'CONTEXTE_JSON:\n' + JSON.stringify(contexteObj) + '\n\nDemande: "' + texteVocal + '"' }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA_COPILOTE, temperature: 0.1 }
  };

  let iaResult;
  try {
    const resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });

    if (resp.getResponseCode() !== 200) {
      Logger.log('Erreur Gemini: ' + resp.getContentText());
      return { message: 'Erreur IA. Réessaie.', confirmation_requise: true, actions_executees: 0 };
    }

    const data = JSON.parse(resp.getContentText());
    const text = data && data.candidates && data.candidates[0] &&
                 data.candidates[0].content && data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!text) {
      Logger.log('Réponse Gemini vide ou filtrée: ' + resp.getContentText().substring(0, 500));
      return { message: 'Réponse IA vide. Reformule.', confirmation_requise: true, actions_executees: 0 };
    }
    iaResult = JSON.parse(text);

    if (typeof iaResult.confirmation_requise !== 'boolean' || !Array.isArray(iaResult.actions)) {
      return { message: 'Réponse IA invalide. Reformule.', confirmation_requise: true, actions_executees: 0 };
    }
  } catch (e) {
    Logger.log('Exception copilote: ' + e.message);
    return { message: 'Problème de connexion copilote.', confirmation_requise: true, actions_executees: 0 };
  }

  // Forcer confirmation sur actions sensibles
  if ((iaResult.actions || []).some(a => COPILOT_FORCE_CONFIRM.includes(a.type))) {
    iaResult.confirmation_requise = true;
  }

  if (iaResult.confirmation_requise) {
    logIACall(enseignantId, 'gemini', 'copilot_ask', texteVocal.length, hashString(texteVocal));
    return {
      message: iaResult.message_vocal,
      confirmation_requise: true,
      actions_proposees: iaResult.actions || [],
      actions_executees: 0
    };
  }

  // Fabrication des events (event-sourcing)
  const cleanEvents = [];
  const resultats = [];

  for (const action of (iaResult.actions || [])) {
    if (!action || !COPILOT_ALLOWED_ACTIONS.includes(action.type)) continue;
    const cible = String(action.cible || '');

    if (action.type === 'seance.validee' || action.type === 'seance.invalidee') {
      if (!seanceIds.has(cible)) continue;
      cleanEvents.push({
        eventId: 'evt-' + Utilities.getUuid().slice(0, 12),
        timestamp: isoParis_(new Date()),
        type: action.type, acteur: enseignantId, cible: cible,
        donnees: action.donnees || {}, source: 'ia_copilot'
      });
      if (action.type === 'seance.validee') {
        const seance = toutesSeances.find(s => s.id === cible);
        if (seance) resultats.push({ type: action.type, cible, success: true, texteED: genererTexteED_v2_(seance) });
      } else {
        resultats.push({ type: action.type, cible, success: true });
      }
    }

    if (action.type === 'competence.evaluee') {
      if (!eleveIds.has(cible)) continue;
      const d = action.donnees || {};
      if (!d.competenceCode || typeof d.niveau === 'undefined') continue;
      if (d.seanceId && !seanceIds.has(String(d.seanceId))) continue;

      cleanEvents.push({
        eventId: 'evt-' + Utilities.getUuid().slice(0, 12),
        timestamp: isoParis_(new Date()),
        type: action.type, acteur: enseignantId, cible: cible,
        donnees: { competenceCode: String(d.competenceCode), niveau: d.niveau, seanceId: d.seanceId ? String(d.seanceId) : '' },
        source: 'ia_copilot'
      });

      const ccf = checkSeuilCCF_(cible, String(d.competenceCode));
      resultats.push({
        type: action.type, cible, success: true,
        ccf_count: ccf.count + 1, ccf_seuil: (ccf.count + 1) >= 3,
      });
    }
  }

  if (cleanEvents.length === 0) {
    logIACall(enseignantId, 'gemini', 'copilot_noop', texteVocal.length, hashString(texteVocal));
    return { message: "Rien de fiable. Précise la séance ou l'élève.", confirmation_requise: true, actions_proposees: iaResult.actions || [], actions_executees: 0 };
  }

  const writeResult = pushEvents(cleanEvents);
  logIACall(enseignantId, 'gemini', 'copilot_exec', texteVocal.length, hashString(texteVocal));

  let messageRetour = iaResult.message_vocal || 'Action effectuée.';
  const ccfAlerts = resultats.filter(r => r.ccf_seuil);
  if (ccfAlerts.length > 0) {
    messageRetour += ' ⚠️ Seuil CCF atteint pour ' + ccfAlerts.map(a => a.cible).join(', ') + '.';
  }

  return {
    message: messageRetour,
    confirmation_requise: false,
    actions_executees: writeResult.written || cleanEvents.length,
    resultats: resultats,
    texte_ed: resultats.find(r => r.texteED) ? resultats.find(r => r.texteED).texteED : null,
  };
}


// ══════════════════════════════════════════════════
// SETUP & DONNÉES DÉMO
// ══════════════════════════════════════════════════

function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  getOrCreateSheet(TABS.EVENT_LOG, ['eventId','timestamp','type','acteur','cible','donnees','source']);
  getOrCreateSheet(TABS.SEANCES, ['seanceId','classe','date','horaire','type','séquenceId','séquenceNom','contenu','compétences','enseignant','statut','dateValidation']);
  getOrCreateSheet(TABS.ELEVES, ['eleveId','classe','codeRGPD','groupe']);
  getOrCreateSheet(TABS.EVALUATIONS, ['eleveId','competenceCode','niveau','seanceId','enseignant','timestamp']);
  getOrCreateSheet(TABS.LOGS_IA, ['Enseignant','Service','Date','Type','Tokens','Coût','Hash']);

  const def = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) { try { ss.deleteSheet(def); } catch(e) {} }
  Logger.log('✅ Structure créée avec succès');
}

function populateDemoSeances() {
  const sheet = getSheet(TABS.SEANCES);
  if (sheet.getLastRow() > 1) { Logger.log('Séances déjà présentes, abandon.'); return; }

  const seances = [];
  const start = new Date(2026, 1, 2); // 02 Fév 2026

  for (let w = 0; w < 4; w++) {
    const monday = new Date(start);
    monday.setDate(monday.getDate() + (w * 7));

    const d = (dayOffset) => {
      const x = new Date(monday); x.setDate(x.getDate() + dayOffset);
      return Utilities.formatDate(x, 'Europe/Paris', 'yyyy-MM-dd');
    };

    seances.push(['sea-' + d(0) + '-2tne-0800', '2TNE', d(0), '08:00 – 10:00', 'hebdo', 'S2', 'Fluides frigo', 'Propriétés des fluides', 'C2.1;C2.3', 'ens-fh', 'pending', '']);
    seances.push(['sea-' + d(1) + '-cap1ifca-0800', 'CAP1 IFCA', d(1), '08:00 – 10:00', 'hebdo', 'S2', 'Mise en service', 'Contrôle pressions', 'CC2.1;CC2.3', 'ens-fh', 'pending', '']);
    seances.push(['sea-' + d(1) + '-tmfer-1330', 'TMFER', d(1), '13:30 – 15:30', 'hebdo', 'S2', 'PAC air/eau', 'Principe PAC', 'C2.1;C2.2', 'ens-fh', 'pending', '']);

    if (w % 2 === 0) {
      seances.push(['sea-' + d(2) + '-cfaetam1a-1000', 'CFA ÉTAM 1A', d(2), '10:00 – 12:00', 'rassemblement', 'S1', 'Étanchéité', 'Test porte soufflante', 'C1.1;C2.1', 'ens-fh', 'pending', '']);
    }
    seances.push(['sea-' + d(2) + '-tpsupcvc-1400', 'TP Sup CVC', d(2), '14:00 – 16:00', 'complement', 'S1', 'Lecture plans', 'Symboles CVC', 'C1.2;C4.1', 'ens-fh', 'pending', '']);

    if (w % 2 !== 0) {
      seances.push(['sea-' + d(4) + '-cfampi1a-0800', 'CFA MPI 1A', d(4), '08:00 – 10:00', 'rassemblement', 'S1', 'Réseaux', 'Brasure cuivre', 'C1.1;C1.2', 'ens-fh', 'pending', '']);
    }
  }

  sheet.getRange(2, 1, seances.length, 12).setValues(seances);
  Logger.log('✅ ' + seances.length + ' séances démo créées');
  populateDemoEleves();
}

function populateDemoEleves() {
  const sheet = getSheet(TABS.ELEVES);
  if (sheet.getLastRow() > 1) return;

  const data = [];
  function add(cls, pfx, n) {
    for (var i = 1; i <= n; i++) {
      data.push(['elv-' + pfx.toLowerCase() + '-' + i, cls, pfx + '-' + String(i).padStart(2, '0'), i <= n / 2 ? 'A' : 'B']);
    }
  }

  add('2TNE', 'TNE', 25);
  add('CAP1 IFCA', 'CAP1', 20);
  add('TMFER', 'TMFER', 30);
  add('CFA ÉTAM 1A', 'ETAM1A', 12);

  sheet.getRange(2, 1, data.length, 4).setValues(data);
  Logger.log('✅ ' + data.length + ' élèves démo créés');
}


// ══════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════

function isoParis_(d) {
  return Utilities.formatDate(d, 'Europe/Paris', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function getSheet(n) {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(n);
}

function getOrCreateSheet(n, h) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let s = ss.getSheetByName(n);
  if (!s) {
    s = ss.insertSheet(n);
    if (h) s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
  }
  return s;
}
