/**
 * Évite qu'une licence Mons/Murcia/Bruxelles débloque le site d'une autre ville
 * (localStorage partagé entre *.netlify.app sur le même navigateur).
 */
(function () {
  'use strict';

  function resolveSiteCitySlug() {
    const host = String(window.location.hostname || '').toLowerCase();
    const slug = 'liege';
    if (slug && host.includes(slug)) return slug;
    return '';
  }

  function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string' || token.split('.').length < 2) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(
        atob(base64).split('').map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''),
      ));
    } catch (_) {
      return null;
    }
  }

  function getStoredLicenseCitySlug() {
    try {
      const direct = localStorage.getItem('clq_city');
      if (direct) return String(direct).trim().toLowerCase();
    } catch (_) {}

    try {
      const ent = JSON.parse(localStorage.getItem('clq_entitlements') || 'null');
      if (ent && ent.city_slug) return String(ent.city_slug).trim().toLowerCase();
    } catch (_) {}

    const token = (() => {
      try {
        return localStorage.getItem('clq_token') || localStorage.getItem('jwt');
      } catch (_) {
        return null;
      }
    })();
    const payload = decodeJwtPayload(token);
    const fromJwt = payload?.entitlements?.city_slug;
    if (fromJwt) return String(fromJwt).trim().toLowerCase();

    return null;
  }

  function hasAnyLicenseArtifacts() {
    try {
      return Boolean(
        localStorage.getItem('clq_short_code')
        || localStorage.getItem('clq_token')
        || localStorage.getItem('jwt')
        || localStorage.getItem('clq_has_access') === '1',
      );
    } catch (_) {
      return false;
    }
  }

  function hasActiveLicenseForThisSite() {
    if (!hasAnyLicenseArtifacts()) return false;
    const site = resolveSiteCitySlug();
    const stored = getStoredLicenseCitySlug();
    if (!site) return true;
    if (!stored) return false;
    return stored === site;
  }

  function hasForeignLicenseForOtherSite() {
    if (!hasAnyLicenseArtifacts()) return false;
    const site = resolveSiteCitySlug();
    const stored = getStoredLicenseCitySlug();
    if (!site || !stored) return false;
    return stored !== site;
  }

  function licenseMatchesSite(citySlug) {
    const site = resolveSiteCitySlug();
    if (!site || !citySlug) return true;
    return String(citySlug).trim().toLowerCase() === site;
  }

  function clearClqSessionKeys() {
    const keys = [
      'clq_token', 'jwt', 'clq_has_access', 'clq_short_code',
      'clq_entitlements', 'clq_city', 'clq_last_checkout',
      'user_version', 'upgrade_type', 'user_state_before_upgrade',
    ];
    keys.forEach((key) => {
      try { localStorage.removeItem(key); } catch (_) {}
    });
    try {
      document.cookie = 'clq_short_code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    } catch (_) {}
  }

  window.ClqLicenseCityGuard = {
    resolveSiteCitySlug,
    getStoredLicenseCitySlug,
    hasAnyLicenseArtifacts,
    hasActiveLicenseForThisSite,
    hasForeignLicenseForOtherSite,
    licenseMatchesSite,
    clearClqSessionKeys,
  };
})();
