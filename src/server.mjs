import { randomBytes } from 'node:crypto';
import { normalizar } from './logic.mjs';
import { LecturasStore } from './store.mjs';
import { crearServidor } from './api.mjs';

const PORT = Number(process.env.PORT || 3000);
const URL_MQTT = process.env.MQTT_URL || 'mqtt://broker.emqx.io:1883';
const TOPICO = process.env.MQTT_TOPIC || 'aquabocachico/g3/v43/478159149049553921/datos';
const store = new LecturasStore(process.env.DATA_FILE || './data/lecturas.jsonl');
let conectado = false;
const servidor = crearServidor(store, () => ({ mqtt: conectado, topic: TOPICO }), process.env.FINCA_NOMBRE);
servidor.listen(PORT, '0.0.0.0', () => console.log(`API AquaBocachico en puerto ${PORT}`));

if (process.env.DISABLE_MQTT === '1') {
  console.log('Conexión MQTT deshabilitada para pruebas locales');
} else {
  const { default: mqtt } = await import('mqtt');
  const cliente = mqtt.connect(URL_MQTT, {
    clientId: `aquabocachico-api-${randomBytes(5).toString('hex')}`,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    keepalive: 45,
    clean: true
  });
  cliente.on('connect', () => {
    conectado = true;
    cliente.subscribe(TOPICO, { qos: 0 }, err => {
      if (err) console.error('No se pudo suscribir al topic:', err.message);
      else console.log('Suscrito:', TOPICO);
    });
  });
  cliente.on('close', () => { conectado = false; });
  cliente.on('error', err => { conectado = false; console.error('MQTT:', err.message); });
  cliente.on('message', (topico, buffer) => {
    if (topico !== TOPICO || buffer.length > 1024) return;
    let payload;
    try { payload = JSON.parse(buffer.toString('utf8')); } catch { return; }
    const lectura = normalizar(payload);
    if (!lectura) { console.warn('Mensaje descartado por formato/origen'); return; }
    try {
      store.guardar(lectura);
      console.log(`Estanque 01 | seq=${lectura.seq} | ${lectura.estado} | ${lectura.coincide ? 'OK' : 'REVISAR'}`);
    } catch (e) { console.error('No se pudo guardar:', e.message); }
  });
}
