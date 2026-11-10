import { MECANISMOS, RegistroDeProveedores } from "./RegistroDeProveedores.js";

const ALGORITMOS_JWT = new Set([
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
  "EdDSA",
  "Ed25519",
]);

const texto = (valor) =>
  typeof valor === "string" && valor.trim() === valor && valor.length > 0;
const lista = (valor, valido) =>
  Array.isArray(valor) &&
  valor.length > 0 &&
  valor.every(valido) &&
  new Set(valor).size === valor.length;

function urlHttp(valor, produccion) {
  if (!texto(valor) || /\s/.test(valor) || !/^https?:\/\//.test(valor)) return false;
  if (valor.includes("\\") || !URL.canParse(valor)) return false;
  const url = new URL(valor);
  return Boolean(
    !url.username &&
      !url.password &&
      !valor.includes("#") &&
      (!produccion || url.protocol === "https:"),
  );
}

function proveedorLogto(entorno) {
  const endpoint = entorno.LOGTO_ENDPOINT;
  const audiencia = entorno.LOGTO_API_RESOURCE;

  if (endpoint && audiencia) {
    if (!urlHttp(endpoint, entorno.NODE_ENV === "production") || endpoint.includes("?")) {
      throw new Error("LOGTO_ENDPOINT debe ser una URL HTTP(S) valida del tenant");
    }
    const base = endpoint.replace(/\/+$/, "");
    return [
      {
        codigo: "logto",
        nombre: "Logto",
        mecanismo: "OIDC_JWT",
        issuers: [`${base}/oidc`],
        audiencia,
        jwksUri: `${base}/oidc/jwks`,
        algoritmos: (entorno.LOGTO_ALGORITMOS ?? "ES384").split(",").map((a) => a.trim()),
      },
    ];
  }

  if (endpoint || audiencia) {
    throw new Error(
      "Para validar sesiones hacen falta LOGTO_ENDPOINT y LOGTO_API_RESOURCE",
    );
  }
  return [];
}

function validarProveedor(proveedor, produccion) {
  if (!proveedor || typeof proveedor !== "object" || Array.isArray(proveedor)) {
    throw new Error("Cada proveedor debe ser un objeto");
  }
  const {
    codigo,
    nombre,
    mecanismo,
    issuers,
    jwksUri,
    audiencia,
    algoritmos,
    tipo,
    cooldownJwksMs,
    toleranciaReloj,
    claimsObligatorios,
  } = proveedor;
  const campos = {
    codigo: texto(codigo) && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(codigo),
    nombre: nombre === undefined || texto(nombre),
    mecanismo: texto(mecanismo) && Object.hasOwn(MECANISMOS, mecanismo),
    issuers: lista(
      issuers,
      (issuer) => urlHttp(issuer, produccion) && !issuer.includes("?"),
    ),
    jwksUri: urlHttp(jwksUri, produccion),
    audiencia: texto(audiencia) || lista(audiencia, texto),
    algoritmos: lista(algoritmos, (alg) => ALGORITMOS_JWT.has(alg)),
    tipo: tipo === undefined || texto(tipo),
    cooldownJwksMs:
      cooldownJwksMs === undefined ||
      (Number.isSafeInteger(cooldownJwksMs) && cooldownJwksMs >= 0),
    toleranciaReloj:
      toleranciaReloj === undefined ||
      (Number.isFinite(toleranciaReloj) && toleranciaReloj >= 0) ||
      (typeof toleranciaReloj === "string" && /^\d+(\.\d+)?s$/.test(toleranciaReloj)),
    claimsObligatorios:
      claimsObligatorios === undefined || lista(claimsObligatorios, texto),
  };
  const invalidos = Object.keys(campos).filter((campo) => !campos[campo]);
  if (invalidos.length) {
    throw new Error("Configuracion invalida de proveedor: " + invalidos.join(", "));
  }
}

export function proveedoresDesdeEntorno(entorno = process.env) {
  if (
    entorno.AUTH_DESACTIVADA !== undefined &&
    !["true", "false"].includes(entorno.AUTH_DESACTIVADA)
  ) {
    throw new Error("AUTH_DESACTIVADA debe ser true o false");
  }
  const permiteDesactivar = ["development", "test"].includes(entorno.NODE_ENV);
  if (entorno.AUTH_DESACTIVADA === "true" && !permiteDesactivar) {
    throw new Error("AUTH_DESACTIVADA=true solo se admite en development o test");
  }

  const proveedores =
    entorno.AUTH_PROVEEDORES !== undefined
      ? JSON.parse(entorno.AUTH_PROVEEDORES)
      : proveedorLogto(entorno);
  if (!Array.isArray(proveedores)) {
    throw new Error("AUTH_PROVEEDORES debe ser un arreglo");
  }
  proveedores.forEach((proveedor) =>
    validarProveedor(proveedor, entorno.NODE_ENV === "production"),
  );
  const codigos = proveedores.map((p) => p.codigo);
  const emisores = proveedores.flatMap((p) => p.issuers);
  if (new Set(codigos).size !== codigos.length) {
    throw new Error("Hay dos proveedores con el mismo codigo");
  }
  if (new Set(emisores).size !== emisores.length) {
    throw new Error("Hay dos proveedores con el mismo emisor");
  }
  if (proveedores.length === 0 && entorno.AUTH_DESACTIVADA !== "true") {
    throw new Error(
      "Falta configurar la autenticacion: LOGTO_ENDPOINT y LOGTO_API_RESOURCE " +
        "(o AUTH_PROVEEDORES). Para desarrollo sin login, NODE_ENV=development y AUTH_DESACTIVADA=true.",
    );
  }
  return proveedores;
}

export function crearAutenticador(proveedores, codigosActivos = null) {
  if (proveedores.length === 0) {
    return null;
  }
  const habilitados = codigosActivos
    ? proveedores.filter((p) => codigosActivos.includes(p.codigo))
    : proveedores;
  if (habilitados.length === 0) {
    throw new Error(
      "Todos los proveedores configurados estan deshabilitados en el catalogo: " +
        "la API no arranca para no quedar sin autenticacion",
    );
  }
  return new RegistroDeProveedores(habilitados);
}

export function crearAutenticadorDesdeEntorno(entorno = process.env) {
  return crearAutenticador(proveedoresDesdeEntorno(entorno));
}
