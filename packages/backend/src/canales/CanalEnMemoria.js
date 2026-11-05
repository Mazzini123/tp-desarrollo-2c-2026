export class CanalEnMemoria {
  constructor({ fallar = false } = {}) {
    this.enviados = [];
    this.fallar = fallar;
  }

  async enviar(mensaje) {
    if (this.fallar) {
      throw new Error("Proveedor no disponible");
    }
    this.enviados.push(mensaje);
  }
}
