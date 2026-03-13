/**
 * state.js — Gestion centralisee de l'etat (appState namespace)
 * Extrait de inerweb_prof.html [B] ETAT GLOBAL
 * Doit etre charge APRES core.js
 */
;(function(){
  'use strict';

  /* ═══ ÉTAT GLOBAL (appState namespace) ═══ */
  window.appState = {
    data:    { students:[], validations:{}, notes:{}, pfmpData:{}, partenaires:[], customCriteria:{}, compLocks:{}, sharedDocs:[] },
    config:  { cfg:{}, appCfg:{} },
    admin:   { users:[], classes:[], adminJournal:[] },
    ui:      { cur:null, curCtx:'atelier', curSit:'A', curPhase:'formatif' },
    session: { online:false, demoMode:false, isAdmin:false, currentUser:null }
  };

  /* Alias retro-compatibles (getters/setters bidirectionnels) */
  // — data —
  Object.defineProperty(window,'students',    {get(){return appState.data.students;},      set(v){appState.data.students=v;},      configurable:true});
  Object.defineProperty(window,'validations', {get(){return appState.data.validations;},   set(v){appState.data.validations=v;},   configurable:true});
  Object.defineProperty(window,'notes',       {get(){return appState.data.notes;},         set(v){appState.data.notes=v;},         configurable:true});
  Object.defineProperty(window,'pfmpData',    {get(){return appState.data.pfmpData;},      set(v){appState.data.pfmpData=v;},      configurable:true});
  Object.defineProperty(window,'partenaires', {get(){return appState.data.partenaires;},   set(v){appState.data.partenaires=v;},   configurable:true});
  Object.defineProperty(window,'customCriteria',{get(){return appState.data.customCriteria;},set(v){appState.data.customCriteria=v;},configurable:true});
  Object.defineProperty(window,'compLocks',   {get(){return appState.data.compLocks;},     set(v){appState.data.compLocks=v;},     configurable:true});
  Object.defineProperty(window,'sharedDocs',  {get(){return appState.data.sharedDocs;},    set(v){appState.data.sharedDocs=v;},    configurable:true});
  // — config —
  Object.defineProperty(window,'cfg',    {get(){return appState.config.cfg;},    set(v){appState.config.cfg=v;},    configurable:true});
  Object.defineProperty(window,'appCfg', {get(){return appState.config.appCfg;}, set(v){appState.config.appCfg=v;}, configurable:true});
  // — admin —
  Object.defineProperty(window,'users',        {get(){return appState.admin.users;},        set(v){appState.admin.users=v;},        configurable:true});
  Object.defineProperty(window,'classes',      {get(){return appState.admin.classes;},      set(v){appState.admin.classes=v;},      configurable:true});
  Object.defineProperty(window,'adminJournal', {get(){return appState.admin.adminJournal;}, set(v){appState.admin.adminJournal=v;}, configurable:true});
  // — ui —
  Object.defineProperty(window,'cur',      {get(){return appState.ui.cur;},      set(v){appState.ui.cur=v;},      configurable:true});
  Object.defineProperty(window,'curCtx',   {get(){return appState.ui.curCtx;},   set(v){appState.ui.curCtx=v;},   configurable:true});
  Object.defineProperty(window,'curSit',   {get(){return appState.ui.curSit;},   set(v){appState.ui.curSit=v;},   configurable:true});
  Object.defineProperty(window,'curPhase', {get(){return appState.ui.curPhase;}, set(v){appState.ui.curPhase=v;}, configurable:true});
  // — session —
  Object.defineProperty(window,'online',      {get(){return appState.session.online;},      set(v){appState.session.online=v;},      configurable:true});
  Object.defineProperty(window,'demoMode',    {get(){return appState.session.demoMode;},    set(v){appState.session.demoMode=v;},    configurable:true});
  Object.defineProperty(window,'isAdmin',     {get(){return appState.session.isAdmin;},     set(v){appState.session.isAdmin=v;},     configurable:true});
  Object.defineProperty(window,'currentUser', {get(){return appState.session.currentUser;}, set(v){appState.session.currentUser=v;}, configurable:true});

})();
