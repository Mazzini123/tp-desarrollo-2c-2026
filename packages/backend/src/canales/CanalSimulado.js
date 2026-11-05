export class CanalSimulado {
  constructor(nombre) {
    this.nombre = nombre;
  }

  async enviar({ destino, asunto }) {
    console.log(`[${this.nombre} simulado] a ${enmascarar(destino)}: ${asunto}`);
  }
}

// Los logs no son privados: no se escribe el contacto completo.
function enmascarar(valor) {
  return valor.length <= 4 ? "****" : `****${valor.slice(-4)}`;
}
