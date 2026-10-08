// Canal que no envia nada: deja constancia en el log.
//
// WhatsApp y SMS requieren un proveedor pago (Twilio, la API de Meta), y el
// enunciado pide privilegiar herramientas economicas. Este canal cumple la
// misma interfaz que CanalEmail, asi que enchufar un proveedor real es escribir
// otra clase con un enviar() y cambiar una linea en composicion.js.
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
