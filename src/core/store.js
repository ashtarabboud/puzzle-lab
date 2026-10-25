/* ===== Persistence: IndexedDB on the device (localStorage fallback), with a persistent-storage request ===== */
(function () {
  var SCHEMA = 2;
  PL.SCHEMA = SCHEMA;
  var DBNAME = 'puzzlelab', STORE = 'kv';
  var mem = {}, idb = null, mode = 'memory', persisted = null, listeners = [];

  function openIDB() {
    return new Promise(function (resolve) {
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open(DBNAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
        req.onblocked = function () { resolve(null); };
        setTimeout(function () { resolve(null); }, 5000);
      } catch (e) { resolve(null); }
    });
  }
  function idbAll(db) {
    return new Promise(function (resolve) {
      try {
        var out = {}, req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
        req.onsuccess = function () { var c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else resolve(out); };
        req.onerror = function () { resolve(out); };
      } catch (e) { resolve({}); }
    });
  }
  // writes are batched per tick so a burst of saves becomes one transaction
  var pending = {}, flushT = null;
  function schedule(k, v) { pending[k] = v; if (!flushT) flushT = setTimeout(flush, 30); }
  function flush() {
    flushT = null;
    var keys = Object.keys(pending); if (!keys.length) return;
    var batch = pending; pending = {};
    if (mode === 'indexeddb') {
      try {
        var tx = idb.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
        keys.forEach(function (k) { if (batch[k] === undefined) st.delete(k); else st.put(batch[k], k); });
        tx.onerror = function () { notify('error'); };
      } catch (e) { notify('error'); }
    } else if (mode === 'localstorage') {
      try { localStorage.setItem('puzzlelab.kv', JSON.stringify(mem)); } catch (e) { notify('error'); }
    }
  }
  function notify(ev) { listeners.forEach(function (f) { try { f(ev); } catch (e) { } }); }

  PL.store = {
    get: function (k) { return mem[k]; },
    keys: function (prefix) { return Object.keys(mem).filter(function (k) { return k.indexOf(prefix) === 0; }); },
    put: function (k, v) { if (v && typeof v === 'object') v.u = Date.now(); mem[k] = v; schedule(k, v); },
    del: function (k) { delete mem[k]; schedule(k, undefined); },
    raw: function () { return mem; },
    flush: flush,
    onChange: function (f) { listeners.push(f); },
    status: function () { return { local: mode, persisted: persisted }; },
    replaceAll: function (obj) {
      Object.keys(mem).forEach(function (k) { if (!(k in obj)) PL.store.del(k); });
      Object.keys(obj).forEach(function (k) { mem[k] = obj[k]; schedule(k, obj[k]); });
      flush();
    },
    init: async function () {
      idb = await openIDB();
      if (idb) { mode = 'indexeddb'; mem = await idbAll(idb); }
      else {
        try { var s = localStorage.getItem('puzzlelab.kv'); mem = s ? JSON.parse(s) : {}; mode = 'localstorage'; } catch (e) { mem = {}; mode = 'memory'; }
      }
      try { if (navigator.storage && navigator.storage.persist) { persisted = await navigator.storage.persisted(); if (!persisted) persisted = await navigator.storage.persist(); } } catch (e) { }
      return mem;
    }
  };
  window.addEventListener && window.addEventListener('pagehide', flush);
  document.addEventListener && document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
})();
