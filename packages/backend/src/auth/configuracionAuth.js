import { crearVerificadorLogto } from "./verificadorLogto.js";

export function crearVerificadorDesdeEntorno(entorno = process.env) {
  const endpoint = entorno.LOGTO_ENDPOINT;
  const audiencia = entorno.LOGTO_API_RESOURCE;

  if (endpoint && audiencia) {
    return crearVerificadorLogto({ endpoint, audiencia });
  }

  if (endpoint || audiencia) {
    throw new Error("Para validar sesiones hacen falta LOGTO_ENDPOINT y LOGTO_API_RESOURCE");
  }

  if (entorno.NODE_ENV === "production" && entorno.AUTH_DESACTIVADA !== "true") {
    throw new Error(
      "En produccion hay que configurar LOGTO_ENDPOINT y LOGTO_API_RESOURCE " +
        "(o AUTH_DESACTIVADA=true para correr sin autenticacion, bajo tu responsabilidad)",
    );
  }

  return null;
}
