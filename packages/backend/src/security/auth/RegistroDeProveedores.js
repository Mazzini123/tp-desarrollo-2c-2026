import { decodeJwt } from "jose";
import { ValidadorOidcJwt } from "./ValidadorOidcJwt.js";
import { tokenInvalido } from "./erroresDeAutenticacion.js";

export const MECANISMOS = Object.freeze({
  OIDC_JWT: (configuracion) => new ValidadorOidcJwt(configuracion),
});

function issuerSinVerificar(token) {
  try {
    return decodeJwt(token).iss;
  } catch {
    throw tokenInvalido();
  }
}

export class RegistroDeProveedores {
  constructor(configuraciones, mecanismos = MECANISMOS) {
    this.porIssuer = new Map();
    for (const configuracion of configuraciones) {
      const crear = mecanismos[configuracion.mecanismo];
      if (!Object.hasOwn(mecanismos, configuracion.mecanismo)) {
        throw new Error(
          `El proveedor "${configuracion.codigo}" usa un mecanismo no soportado: ${configuracion.mecanismo}`,
        );
      }
      const validador = crear(configuracion);
      for (const issuer of configuracion.issuers) {
        if (this.porIssuer.has(issuer)) {
          throw new Error(`Dos proveedores usan el mismo emisor: ${issuer}`);
        }
        this.porIssuer.set(issuer, { codigo: configuracion.codigo, validador });
      }
    }
  }

  async autenticar(token) {
    const proveedor = this.porIssuer.get(issuerSinVerificar(token));
    if (!proveedor) {
      throw tokenInvalido();
    }
    const { sub, expiraEn } = await proveedor.validador.validar(token);
    return { proveedor: proveedor.codigo, sub, expiraEn };
  }
}
