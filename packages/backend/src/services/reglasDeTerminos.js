import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";
import { DomainError } from "../errors/DomainError.js";

export function siguienteVersion(vigente) {
  return (vigente?.version ?? 0) + 1;
}

// Sin terminos publicados no se exige nada. Con terminos, la version aceptada
// tiene que ser la vigente.
export function aceptacionDeTerminos(vigente, versionAceptada, ahora) {
  if (!vigente) return null;
  if (versionAceptada !== vigente.version) {
    throw new DomainError(
      `Hay que aceptar la version ${vigente.version} de los terminos y condiciones`,
      CODIGO_ERROR.TERMINOS_NO_ACEPTADOS,
      { versionVigente: vigente.version },
    );
  }
  return { version: vigente.version, aceptadosEn: ahora };
}
