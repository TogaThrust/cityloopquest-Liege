import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Vite ne sert pas les .js à la racine du projet : on les expose pour le dev. */
const ROOT_SCRIPTS = new Set(['api-base.js']);

function readGoogleMapsApiKey() {
  const envPath = path.join(__dirname, '.env');
  const envLocalPath = path.join(__dirname, '.env.local');
  for (const file of [envLocalPath, envPath]) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/GOOGLE_MAPS_API_KEY\s*=\s*([^\s#]+)/);
    if (m && m[1]) return m[1].trim().replace(/^['"]|['"]$/g, '');
  }
  const keyFile = path.join(__dirname, 'Clé API.txt');
  if (fs.existsSync(keyFile)) {
    const m = fs.readFileSync(keyFile, 'utf8').match(/AIza[A-Za-z0-9_-]+/);
    if (m) return m[0];
  }
  const distKey = path.join(__dirname, 'dist', 'api-key.js');
  if (fs.existsSync(distKey)) {
    const m = fs.readFileSync(distKey, 'utf8').match(/AIza[A-Za-z0-9_-]+/);
    if (m) return m[0];
  }
  return null;
}

function serveRootScriptsPlugin() {
  const attach = (server) => {
    server.middlewares.use((req, res, next) => {
      const name = (req.url || '').split('?')[0].replace(/^\//, '');

      if (name === 'api-key.js') {
        const key = readGoogleMapsApiKey();
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        if (key) {
          res.end(`window.__GOOGLE_MAPS_API_KEY__='${key}';`);
        } else {
          res.end('console.warn("[CLQ] api-key.js: définir GOOGLE_MAPS_API_KEY dans .env ou Clé API.txt");');
        }
        return;
      }

      if (!ROOT_SCRIPTS.has(name)) return next();
      const filePath = path.join(__dirname, name);
      if (!fs.existsSync(filePath)) return next();
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.end(fs.readFileSync(filePath, 'utf8'));
    });
  };
  return {
    name: 'clq-serve-root-scripts',
    configureServer: attach,
    configurePreviewServer: attach
  };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function poiProposeDevPlugin() {
  let handlerPromise;
  const loadHandler = () => {
    if (!handlerPromise) {
      const handlerPath = path.join(__dirname, 'netlify', 'functions', 'poi-propose.mjs');
      handlerPromise = import(pathToFileURL(handlerPath).href).then((mod) => mod.handler);
    }
    return handlerPromise;
  };

  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url || '').split('?')[0];
      if (pathname !== '/.netlify/functions/poi-propose') return next();

      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      };

      if (req.method === 'OPTIONS') {
        res.writeHead(204, cors);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'method_not_allowed' }));
        return;
      }

      try {
        const body = await readRequestBody(req);
        const handler = await loadHandler();
        const result = await handler({
          httpMethod: 'POST',
          body,
          isBase64Encoded: false,
          headers: req.headers,
        });
        res.writeHead(result.statusCode || 500, { ...cors, ...(result.headers || {}) });
        res.end(result.body || '');
      } catch (err) {
        res.writeHead(500, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', detail: String(err?.message || err) }));
      }
    });
  };

  return {
    name: 'clq-poi-propose-dev',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

const apiProxy = {
  '/api': {
    target: 'https://cityloopquest-api.onrender.com',
    changeOrigin: true,
    secure: true
  }
};

export default defineConfig(({ mode }) => {
  loadEnv(mode, __dirname, '');
  const devHttp = process.env.CLQ_DEV_HTTP === '1';
  return {
    plugins: devHttp
      ? [serveRootScriptsPlugin(), poiProposeDevPlugin()]
      : [basicSsl(), serveRootScriptsPlugin(), poiProposeDevPlugin()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https: !devHttp,
      proxy: apiProxy,
      hmr: devHttp
        ? undefined
        : {
            protocol: 'wss',
            host: 'localhost'
          }
    },
    preview: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: apiProxy
    }
  };
});

