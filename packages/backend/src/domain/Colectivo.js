export class Colectivo {
  estaDadoDeBaja() {
    return this.fechaBaja !== null && this.fechaBaja !== undefined;
  }

  darDeBaja(fecha) {
    this.fechaBaja = fecha;
  }
}
