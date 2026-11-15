import { createRemoteJWKSet, customFetch, errors, jwtVerify } from "jose";
import { tokenInvalido } from "./erroresDeAutenticacion.js";
import { ServiceUnavailableError } from "../../errors/ServiceUnavailableError.js";
import { CODIGO_ERROR } from "../../errors/CODIGO_ERROR.js";

const FALLAS_DEL_JWKS = [
  "Expected 200 OK from the JSON Web Key Set HTTP response",
  "Failed to parse the JSON Web Key Set HTTP response as JSON",
];

function esFallaDelJwks(error) {
  return (
    error instanceof errors.JWKSTimeout ||
    error instanceof errors.JWKSInvalid ||
    error instanceof ServiceUnavailableError ||
    (error instanceof errors.JOSEError && FALLAS_DEL_JWKS.includes(error.message))
  );
}

const proveedorNoDisponible = () =>
  new ServiceUnavailableError(
    "No pudimos verificar la sesion. Proba de nuevo en unos minutos.",
    CODIGO_ERROR.PROVEEDOR_NO_DISPONIBLE,
  );

export class ValidadorOidcJwt {
  constructor({
    issuers,
    audiencia,
    jwksUri,
    algoritmos,
    toleranciaReloj = "5s",
    tipo,
    claimsObligatorios = [],
    cooldownJwksMs = 30_000,
  }) {
    this.opciones = {
      issuer: issuers,
      audience: audiencia,
      algorithms: algoritmos,
      requiredClaims: [...new Set(["sub", "exp", "iat", ...claimsObligatorios])],
      clockTolerance: toleranciaReloj,
      ...(tipo && { typ: tipo }),
    };
    this.claves = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: 10 * 60_000,
      cooldownDuration: cooldownJwksMs,
      timeoutDuration: 5_000,
      [customFetch]: (...args) =>
        fetch(...args).catch(() => {
          throw proveedorNoDisponible();
        }),
    });
  }

  async validar(token) {
    try {
      const { payload } = await jwtVerify(token, this.claves, this.opciones);
      const expiraEn = new Date(payload.exp * 1000);
      if (
        typeof payload.sub !== "string" ||
        !payload.sub.trim() ||
        !Number.isFinite(expiraEn.getTime()) ||
        !Number.isFinite(payload.iat) ||
        (payload.nbf !== undefined && !Number.isFinite(payload.nbf))
      ) {
        throw tokenInvalido();
      }
      return { sub: payload.sub, expiraEn };
    } catch (error) {
      if (esFallaDelJwks(error)) {
        throw proveedorNoDisponible();
      }
      throw tokenInvalido();
    }
  }
}
