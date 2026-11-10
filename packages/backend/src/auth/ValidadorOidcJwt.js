import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";
import { ServiceUnavailableError } from "../errors/ServiceUnavailableError.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";

const FALLAS_DEL_JWKS = [
  "Expected 200 OK from the JSON Web Key Set HTTP response",
  "Failed to parse the JSON Web Key Set HTTP response as JSON",
];

function esFallaDelJwks(error) {
  return (
    error instanceof errors.JWKSTimeout ||
    error instanceof errors.JWKSInvalid ||
    error?.name === "TypeError" ||
    (error instanceof errors.JOSEError && FALLAS_DEL_JWKS.includes(error.message))
  );
}

export function tokenInvalido() {
  return new UnauthorizedError(
    "La sesion no es valida o vencio",
    CODIGO_ERROR.TOKEN_INVALIDO,
  );
}

export class ValidadorOidcJwt {
  constructor({
    issuers,
    audiencia,
    jwksUri,
    algoritmos,
    toleranciaReloj = "5s",
    tipo,
    cooldownJwksMs = 30_000,
  }) {
    this.opciones = {
      issuer: issuers,
      audience: audiencia,
      algorithms: algoritmos,
      requiredClaims: ["sub", "exp", "iat"],
      clockTolerance: toleranciaReloj,
      ...(tipo && { typ: tipo }),
    };
    this.claves = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: 10 * 60_000,
      cooldownDuration: cooldownJwksMs,
      timeoutDuration: 5_000,
    });
  }

  async validar(token) {
    try {
      const { payload } = await jwtVerify(token, this.claves, this.opciones);
      return { sub: payload.sub, expiraEn: new Date(payload.exp * 1000) };
    } catch (error) {
      if (esFallaDelJwks(error)) {
        throw new ServiceUnavailableError(
          "No pudimos verificar la sesion. Proba de nuevo en unos minutos.",
          CODIGO_ERROR.PROVEEDOR_NO_DISPONIBLE,
        );
      }
      throw tokenInvalido();
    }
  }
}
