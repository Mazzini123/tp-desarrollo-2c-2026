import { rateLimit } from "express-rate-limit";

// Requerimiento adicional 14: "Proteger las busquedas y APIs publicas contra
// scraping o abuso mediante limites de solicitudes por IP/usuario".
//
// Todavia no hay usuarios (llegan con la autenticacion, en la tercera
// entrega), asi que el limite es por IP. El contador vive en la memoria del
// proceso: alcanza porque la API corre en un solo contenedor. Con varias
// replicas habria que compartirlo (por ejemplo en Redis).

const QUINCE_MINUTOS = 15 * 60 * 1000;
const UN_MINUTO = 60 * 1000;

export const LIMITES_POR_DEFECTO = Object.freeze({
  // Todo el trafico: generoso, para no molestar a un uso normal del frontend.
  general: 300,
  // Busquedas y estadisticas: son las consultas mas caras y las que un
  // scraper recorreria.
  busquedas: 30,
});

function crearLimitador({ ventanaMs, limite, mensaje }) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    // Informa el cupo en la cabecera estandar RateLimit.
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // /health lo consultan los monitores: no cuenta.
    skip: (req) => req.path === "/health",
    // Misma forma que el resto de los errores de la API: { message }.
    handler: (_req, res) => res.status(429).json({ message: mensaje }),
  });
}

export function crearLimitadores(limites = {}) {
  const { general, busquedas } = { ...LIMITES_POR_DEFECTO, ...limites };

  return {
    general: crearLimitador({
      ventanaMs: QUINCE_MINUTOS,
      limite: general,
      mensaje: "Demasiadas solicitudes desde esta IP. Proba de nuevo en unos minutos.",
    }),
    busquedas: crearLimitador({
      ventanaMs: UN_MINUTO,
      limite: busquedas,
      mensaje: "Demasiadas busquedas desde esta IP. Proba de nuevo en un minuto.",
    }),
  };
}

// Permite ajustar los limites sin tocar codigo (por ejemplo, en la VM).
export function limitesDesdeEntorno(entorno = process.env) {
  const limites = {};
  if (entorno.LIMITE_SOLICITUDES_GENERAL) {
    limites.general = Number(entorno.LIMITE_SOLICITUDES_GENERAL);
  }
  if (entorno.LIMITE_SOLICITUDES_BUSQUEDAS) {
    limites.busquedas = Number(entorno.LIMITE_SOLICITUDES_BUSQUEDAS);
  }
  return limites;
}
