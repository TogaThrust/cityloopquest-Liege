/** Service Worker : enregistrement en prod uniquement ; nettoyage en dev Vite/local */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var port = String(location.port || '');
  var host = String(location.hostname || '').toLowerCase();
  var isDev =
    (port === '5173' || port === '5174' || (location.search || '').indexOf('dev=1') !== -1) &&
    (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' ||
      /^192\.168\./.test(host) || /^10\./.test(host));

  if (isDev) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) {
        r.unregister();
      });
    });
    if ('caches' in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          caches.delete(k);
        });
      });
    }
    return;
  }

  navigator.serviceWorker.register('service-worker.js?v=36')
    .then(function () {
      console.log('Service Worker enregistré.');
    })
    .catch(function (error) {
      console.log('Service Worker échec :', error);
    });
})();
