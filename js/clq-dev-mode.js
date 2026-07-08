/**
 * Mode dev : ?dev=1 dans l'URL (persisté en session pour les navigations internes).
 * Utilisé pour bypasser la garde d'accès en tests sur Netlify / mobile.
 */
(function () {
  'use strict';

  function hasDevInUrl() {
    try {
      return (window.location.search || '').indexOf('dev=1') !== -1;
    } catch (_) {
      return false;
    }
  }

  function persistDevMode() {
    try {
      if (hasDevInUrl()) sessionStorage.setItem('clq_dev_mode', '1');
    } catch (_) {}
  }

  function isDevModeActive() {
    try {
      const host = String(window.location.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
      if (hasDevInUrl()) {
        persistDevMode();
        return true;
      }
      return sessionStorage.getItem('clq_dev_mode') === '1';
    } catch (_) {
      return false;
    }
  }

  function appendDevQuery(url) {
    const base = String(url || '');
    if (!isDevModeActive()) return base;
    if (base.indexOf('dev=1') !== -1) return base;
    return base + (base.indexOf('?') === -1 ? '?dev=1' : '&dev=1');
  }

  window.clqDevMode = {
    isActive: isDevModeActive,
    append: appendDevQuery,
    persist: persistDevMode,
  };

  persistDevMode();
})();
