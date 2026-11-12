import { registro } from "../config/registro.js";

export class CanalSimulado {
  constructor(nombre) {
    this.nombre = nombre;
  }

  async enviar({ destino, asunto }) {
    registro.info("envio_simulado", {
      canal: this.nombre,
      destino: enmascarar(destino),
      asunto,
    });
    return { simulado: true };
  }
}

function enmascarar(valor) {
  return valor.length <= 4 ? "****" : `****${valor.slice(-4)}`;
}
