import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESTANQUES, RANGOS } from './logic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'));

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(payload));
}

export function crearServidor(store, estadoConexion, nombreFinca = 'Finca sin configurar') {
  return http.createServer((req, res) => {
    if (!req.url || req.method !== 'GET') return json(res, 405, { error: 'Solo lectura (GET)' });
    const url = new URL(req.url, 'http://localhost');
    const ruta = url.pathname;
    if (ruta === '/' || ruta === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html); return;
    }
    if (ruta === '/health') return json(res, 200, { servidor: 'activo', mqtt: estadoConexion().mqtt });
    if (ruta === '/api/estado') return json(res, 200, {
      sistema: 'AquaBocachico', finca: nombreFinca,
      mqtt: estadoConexion().mqtt, topic: estadoConexion().topic,
      ultimaRecepcion: store.ultima('estanque-01')?.recibidoEn ?? null,
      fuente: 'Wokwi V4.3 / MQTT sobre Wi-Fi', loraValidado: false
    });
    if (ruta === '/api/rangos') return json(res, 200, RANGOS);
    if (ruta === '/api/estanques') return json(res, 200, {
      finca: nombreFinca,
      estanques: ESTANQUES.map(e => ({
        id: e.id, nombre: e.nombre, vinculado: !!e.origen,
        lecturaActual: store.ultima(e.id)
      }))
    });
    const m = ruta.match(/^\/api\/estanques\/(estanque-0[1-3])(?:\/(lecturas))?$/);
    if (m) {
      const e = ESTANQUES.find(p => p.id === m[1]);
      if (!e) return json(res, 404, { error: 'Estanque no encontrado' });
      if (m[2] === 'lecturas') {
        const limite = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limite') || '30', 10) || 30));
        return json(res, 200, { estanqueId: e.id, lecturas: store.ultimas(e.id, limite) });
      }
      return json(res, 200, {
        id: e.id, nombre: e.nombre, vinculado: !!e.origen,
        lecturaActual: store.ultima(e.id),
        informacionCultivo: null
      });
    }
    return json(res, 404, { error: 'Ruta no encontrada' });
  });
}
