import { createRemoteJWKSet, jwtVerify } from "jose";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";

export function crearVerificadorLogto({ endpoint, audiencia }) {
  const base = endpoint.replace(/\/+$/, "");
  const emisor = `${base}/oidc`;
  const claves = createRemoteJWKSet(new URL(`${emisor}/jwks`));

  return {
    async verificar(token) {
      try {
        const { payload } = await jwtVerify(token, claves, {
          issuer: emisor,
          audience: audiencia,
        });
        if (!payload.sub) {
          throw new Error("El token no tiene sub");
        }
        return { sub: payload.sub };
      } catch {
        throw new UnauthorizedError("La sesion no es valida o vencio");
      }
    },
  };
}
