import { randomUUID } from "node:crypto";

// Un mensaje dentro de la plataforma para una persona colaboradora.
// Por ahora el destinatario es siempre un colaborador; cuando exista Usuario
// (tercera entrega, autenticacion) pasa a apuntar a el.
export class NotificacionInterna {
  constructor({
    id = randomUUID(),
    destinatarioId,
    tipo,
    asunto,
    contenido,
    referencias = {},
    fecha = new Date(),
    esLeida = false,
    envios = [],
  }) {
    this.id = id;
    this.destinatarioId = destinatarioId;
    this.tipo = tipo;
    this.asunto = asunto;
    this.contenido = contenido;
    // Ids relacionados (proyectoId, perfilId...) para que el frontend arme links.
    this.referencias = referencias;
    this.fecha = fecha;
    this.esLeida = esLeida;
    // Resultado de replicarla por los medios externos: [{ canal, exito }].
    this.envios = envios;
  }

  marcarComoLeida() {
    this.esLeida = true;
  }
}
