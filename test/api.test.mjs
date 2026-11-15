import test from 'node:test';
import assert from 'node:assert/strict';
import { LecturasStore } from '../src/store.mjs';
import { crearServidor } from '../src/api.mjs';
import { normalizar } from '../src/logic.mjs';

test('API devuelve la última lectura, historial y estanques sin emisor', async t => {
  const store=new LecturasStore('');
  const server=crearServidor(store,()=>({mqtt:true,topic:'topic-test'}),'Finca de prueba');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const inicial=await (await fetch(base+'/api/estanques')).json();
  assert.equal(inicial.estanques[0].lecturaActual,null);
  const lectura=normalizar({T:27.5,pH:7,OD:6.28,Estado:'NORMAL',seq:1,origen:'AquaBocachico-G3'});
  store.guardar(lectura);
  const [detalle,historial,estado]=await Promise.all([
    fetch(base+'/api/estanques/estanque-01').then(r=>r.json()),
    fetch(base+'/api/estanques/estanque-01/lecturas?limite=10').then(r=>r.json()),
    fetch(base+'/api/estado').then(r=>r.json())
  ]);
  assert.equal(detalle.lecturaActual.seq,1);
  assert.equal(historial.lecturas.length,1);
  assert.equal(estado.loraValidado,false);
  const segundo=await (await fetch(base+'/api/estanques/estanque-02')).json();
  assert.equal(segundo.lecturaActual,null);
  assert.equal(segundo.vinculado,false);
});
