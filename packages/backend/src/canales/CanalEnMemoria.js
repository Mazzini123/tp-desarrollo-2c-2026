// Doble de test: guarda lo que "envia" para que el test lo pueda revisar.
// Con fallar = true simula un proveedor caido.
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
