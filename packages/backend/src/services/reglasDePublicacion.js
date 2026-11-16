import { ConflictError } from "../errors/ConflictError.js";
import { DomainError } from "../errors/DomainError.js";

export function verificarEditable(proyecto, accion) {
  if (proyecto.estaEnRevision()) {
    throw new ConflictError(
      `No se puede ${accion} un proyecto mientras administración lo revisa`,
    );
  }
  if (proyecto.estaDadoDeBaja()) {
    throw new ConflictError(`No se puede ${accion} un proyecto dado de baja`);
  }
  if (!proyecto.esEditable()) {
    throw new ConflictError(`No se puede ${accion} un proyecto finalizado`);
  }
}

export function verificarPublicable(proyecto, ahora = new Date()) {
  if (proyecto.fechaCierre && proyecto.fechaCierre <= ahora) {
    throw new DomainError(
      "La fecha de cierre ya pasó: cambiala antes de publicar el proyecto",
    );
  }
}
