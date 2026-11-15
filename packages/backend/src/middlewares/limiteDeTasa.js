import { rateLimit } from "express-rate-limit";
import { enteroDeEntorno } from "../config/entorno.js";

const QUINCE_MINUTOS = 15 * 60 * 1000;
const UN_MINUTO = 60 * 1000;

export const LIMITES_POR_DEFECTO = Object.freeze({
  general: 300,
  busquedas: 30,
});

function crearLimitador({ ventanaMs, limite, mensaje }) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req) => ["/health", "/ready"].includes(req.path.replace(/\/$/, "")),
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

export function limitesDesdeEntorno(entorno = process.env) {
  const limites = {};
  if (entorno.LIMITE_SOLICITUDES_GENERAL) {
    limites.general = enteroDeEntorno(entorno, "LIMITE_SOLICITUDES_GENERAL", 300);
  }
  if (entorno.LIMITE_SOLICITUDES_BUSQUEDAS) {
    limites.busquedas = enteroDeEntorno(entorno, "LIMITE_SOLICITUDES_BUSQUEDAS", 30);
  }
  return limites;
}
