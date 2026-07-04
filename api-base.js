// api-base.js — sélection automatique de l'API (DEV/PROD) + override local
// @ts-nocheck
(function () {
  'use strict';

  var PROD_API = 'https://cityloopquest-api.onrender.com';

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function trimBase(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  function isLocalHostFn() {
    try {
      var h = String(location.hostname || '').toLowerCase();
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    } catch (_) {}
    return false;
  }

  function isLocalApiUrl(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(String(url || '').trim());
  }

  function readUrlApiBase() {
    try {
      var urlApi = new URLSearchParams(location.search).get('api_base');
      if (!urlApi) return null;
      var u = new URL(urlApi);
      var clean = trimBase(u.protocol + '//' + u.host);
      safeSet('api_base', clean);
      return clean;
    } catch (_) {}
    return null;
  }

  function readMetaApiBase() {
    try {
      var meta = document.querySelector('meta[name="api-base"]');
      if (meta && meta.content && /^https?:\/\//i.test(meta.content.trim())) {
        var content = trimBase(meta.content);
        if (isLocalHostFn() && isLocalApiUrl(content)) return null;
        return content;
      }
    } catch (_) {}
    return null;
  }

  function readExplicitLocalDevApi(urlApi) {
    if (!urlApi || !isLocalApiUrl(urlApi)) return null;
    return trimBase(urlApi);
  }

  var isLocalHost = isLocalHostFn();
  var urlApi = readUrlApiBase();
  var metaApi = readMetaApiBase();
  var localDevApi = readExplicitLocalDevApi(urlApi);

  var stored = safeGet('api_base');
  if (isLocalHost && !urlApi && isLocalApiUrl(stored)) {
    safeSet('api_base', PROD_API);
    stored = PROD_API;
  }

  var prewired = (typeof window !== 'undefined' &&
                  window.APP_CONFIG && window.APP_CONFIG.API_BASE) || null;
  if (prewired && isLocalHost && !urlApi && isLocalApiUrl(prewired)) {
    prewired = null;
  }

  // Priorité : ?api_base= (local explicite) > meta prod > PROD
  // L'API locale n'est utilisée que si ?api_base=http://localhost:PORT est dans l'URL
  var apiBase = prewired || localDevApi || metaApi || PROD_API;
  apiBase = trimBase(apiBase);

  safeSet('api_base', apiBase);

  window.APP_CONFIG = window.APP_CONFIG || {};
  window.APP_CONFIG.API_BASE = apiBase;

  window.resolveApiBase = function resolveApiBase() {
    try {
      if (window.APP_CONFIG && window.APP_CONFIG.API_BASE) {
        var current = trimBase(window.APP_CONFIG.API_BASE);
        if (isLocalHostFn() && isLocalApiUrl(current)) {
          var qsApi = new URLSearchParams(location.search).get('api_base');
          if (!qsApi) return PROD_API;
        }
        return current;
      }
    } catch (_) {}
    var saved = safeGet('api_base');
    if (saved && /^https?:\/\//i.test(saved)) {
      if (isLocalHostFn() && isLocalApiUrl(saved) && !new URLSearchParams(location.search).get('api_base')) {
        return PROD_API;
      }
      return trimBase(saved);
    }
    return PROD_API;
  };

  window.clqApiFetch = function clqApiFetch(path, opts) {
    var base = window.resolveApiBase();
    var url = base + (path.charAt(0) === '/' ? path : '/' + path);
    var headers = Object.assign(
      { 'ngrok-skip-browser-warning': 'true' },
      (opts && opts.headers) || {}
    );
    return fetch(url, Object.assign({ cache: 'no-store', headers: headers }, opts || {}));
  };

  (function exposeDevSetter() {
    if (!isLocalHost) return;
    window.setApiBase = function (url) {
      if (typeof url !== 'string' || !url.trim()) return;
      var clean = trimBase(url);
      safeSet('api_base', clean);
      window.APP_CONFIG.API_BASE = clean;
      return clean;
    };
    window.useProdApi = function () {
      safeSet('api_base', PROD_API);
      window.APP_CONFIG.API_BASE = PROD_API;
      return PROD_API;
    };
  })();
})();

(function prefillActivation() {
  try {
    var qs = new URLSearchParams(location.search);
    var prefill = (qs.get('prefill') || '').trim();
    if (!prefill) return;
    var input = document.querySelector('#code');
    if (input && 'value' in input) {
      input.value = prefill;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
  } catch (_) {}
})();
