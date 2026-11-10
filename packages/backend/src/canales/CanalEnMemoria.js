export class CanalEnMemoria {
  constructor({ fallar = false, colgar = false } = {}) {
    this.enviados = [];
    this.fallar = fallar;
    this.colgar = colgar;
  }

  async enviar(mensaje) {
    if (this.colgar) {
      return new Promise(() => {});
    }
    if (this.fallar) {
      throw new Error("Proveedor no disponible");
    }
    this.enviados.push(mensaje);
  }
}
