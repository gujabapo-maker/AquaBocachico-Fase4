import test from 'node:test';
import assert from 'node:assert/strict';
import { clasificar, incidencias, normalizar } from '../src/logic.mjs';

const casos = [
  [27,7,6,'NORMAL'],[28,7,5.5,'NORMAL'],[29,7.1,6,'NORMAL'],[26.7,6.9,5.7,'NORMAL'],[29.3,7.2,5.2,'NORMAL'],
  [27,7.35,6,'ADVERTENCIA'],[27,6.7,6,'ADVERTENCIA'],[27,7,4.8,'ADVERTENCIA'],[26.2,7,6,'ADVERTENCIA'],[29.8,7,6,'ADVERTENCIA'],
  [27,6,6,'CRITICO'],[27,7.8,6,'CRITICO'],[25.5,7,6,'CRITICO'],[31,7,6,'CRITICO'],[27,7,3.5,'CRITICO']
];

test('las reglas de clasificación reproducen 15 escenarios de referencia', () => {
  for (const [T,pH,OD,esperado] of casos) assert.equal(clasificar(T,pH,OD),esperado);
});

test('el valor 4,5 mg/L de oxígeno es crítico', () => {
  assert.equal(clasificar(27,7,4.5),'CRITICO');
});

test('valida un JSON recibido desde el ESP32', () => {
  const dato=normalizar({T:27.5,pH:7,OD:4.8,Estado:'ADVERTENCIA',seq:6,origen:'AquaBocachico-G3'});
  assert.equal(dato.estanqueId,'estanque-01');
  assert.equal(dato.coincide,true);
  assert.ok(dato.incidencias.some(i=>i.variable==='oxigeno'));
  assert.equal(dato.transporte,'MQTT/Wi-Fi simulado');
});

test('rechaza datos incompletos y orígenes desconocidos', () => {
  assert.equal(normalizar({T:27.5,pH:7,Estado:'NORMAL',seq:4,origen:'AquaBocachico-G3'}),null);
  assert.equal(normalizar({T:27.5,pH:7,OD:6,Estado:'NORMAL',seq:4,origen:'externo'}),null);
});

test('la advertencia no se confunde con un resultado fuera del rango crítico', () => {
  assert.equal(incidencias(27,7.35,6)[0].mensaje,'pH cerca del límite');
});

test('acepta temperaturas críticas dentro del rango del DS18B20', () => {
  const recibido = normalizar({ T: 62.62, pH: 6.95, OD: 6.28, Estado: 'CRITICO', seq: 14, origen: 'AquaBocachico-G3' });
  assert.ok(recibido);
  assert.equal(recibido.estadoCalculado, 'CRITICO');
  assert.equal(recibido.coincide, true);
  assert.ok(recibido.incidencias.some(i => i.variable === 'temperatura'));
  assert.equal(normalizar({ T: 126, pH: 7, OD: 6, Estado: 'CRITICO', seq: 15, origen: 'AquaBocachico-G3' }), null);
});
