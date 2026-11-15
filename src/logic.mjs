// Las reglas son las mismas de sketch.ino, versión V4.3.
export const RANGOS = Object.freeze({
  temperatura: { min: 26, max: 30, advertenciaMin: 26.5, advertenciaMax: 29.5 },
  ph: { min: 6.5, max: 7.5, advertenciaMin: 6.8, advertenciaMax: 7.2 },
  oxigeno: { minExclusivo: 4.5, advertenciaMaxInclusivo: 5.0 }
});

export const ESTANQUES = Object.freeze([
  { id: 'estanque-01', nombre: 'Estanque 01', origen: 'AquaBocachico-G3' },
  { id: 'estanque-02', nombre: 'Estanque 02', origen: null },
  { id: 'estanque-03', nombre: 'Estanque 03', origen: null }
]);

export function clasificar(T, pH, OD) {
  if (T < 26 || T > 30 || pH < 6.5 || pH > 7.5 || OD <= 4.5) return 'CRITICO';
  if (T < 26.5 || T > 29.5 || pH < 6.8 || pH > 7.2 || OD <= 5.0) return 'ADVERTENCIA';
  return 'NORMAL';
}

export function incidencias(T, pH, OD) {
  const a = [];
  if (T < 26) a.push({ variable: 'temperatura', nivel: 'CRITICO', mensaje: 'Temperatura baja' });
  else if (T > 30) a.push({ variable: 'temperatura', nivel: 'CRITICO', mensaje: 'Temperatura alta' });
  else if (T < 26.5 || T > 29.5) a.push({ variable: 'temperatura', nivel: 'ADVERTENCIA', mensaje: 'Temperatura cerca del límite' });
  if (pH < 6.5) a.push({ variable: 'ph', nivel: 'CRITICO', mensaje: 'pH bajo' });
  else if (pH > 7.5) a.push({ variable: 'ph', nivel: 'CRITICO', mensaje: 'pH alto' });
  else if (pH < 6.8 || pH > 7.2) a.push({ variable: 'ph', nivel: 'ADVERTENCIA', mensaje: 'pH cerca del límite' });
  if (OD <= 4.5) a.push({ variable: 'oxigeno', nivel: 'CRITICO', mensaje: 'Oxígeno bajo' });
  else if (OD <= 5.0) a.push({ variable: 'oxigeno', nivel: 'ADVERTENCIA', mensaje: 'Oxígeno cerca del mínimo' });
  return a;
}

const valorValido = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;

export function normalizar(payload, recibidoEn = new Date()) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const { T, pH, OD, Estado, seq, origen } = payload;
  if (origen !== 'AquaBocachico-G3') return null;
  if (!valorValido(T, -55, 125) || !valorValido(pH, 0, 14) || !valorValido(OD, 0, 25)) return null;
  if (!['NORMAL', 'ADVERTENCIA', 'CRITICO'].includes(Estado)) return null;
  if (!Number.isSafeInteger(seq) || seq < 1) return null;
  const esperado = clasificar(T, pH, OD);
  return {
    estanqueId: 'estanque-01',
    origen, seq, T, pH, OD, estado: Estado,
    estadoCalculado: esperado,
    coincide: Estado === esperado,
    incidencias: incidencias(T, pH, OD),
    recibidoEn: recibidoEn.toISOString(),
    transporte: 'MQTT/Wi-Fi simulado'
  };
}
