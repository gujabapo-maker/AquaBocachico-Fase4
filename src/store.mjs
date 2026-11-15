import fs from 'node:fs';
import path from 'node:path';

export class LecturasStore {
  constructor(archivo = '') {
    this.archivo = archivo;
    this.lecturas = [];
    if (!archivo || !fs.existsSync(archivo)) return;
    for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
      if (!linea.trim()) continue;
      try {
        const dato = JSON.parse(linea);
        if (dato && dato.estanqueId && typeof dato.T === 'number') this.lecturas.push(dato);
      } catch { /* Una línea truncada no impide iniciar la API. */ }
    }
    this.lecturas = this.lecturas.slice(-1000);
  }

  guardar(lectura) {
    this.lecturas.push(lectura);
    if (this.lecturas.length > 1000) this.lecturas.shift();
    if (this.archivo) {
      fs.mkdirSync(path.dirname(this.archivo), { recursive: true });
      fs.appendFileSync(this.archivo, JSON.stringify(lectura) + '\n', 'utf8');
    }
  }

  ultimas(estanqueId, limite = 30) {
    return this.lecturas.filter(x => x.estanqueId === estanqueId).slice(-limite).reverse();
  }

  ultima(estanqueId) { return this.ultimas(estanqueId, 1)[0] ?? null; }
}
