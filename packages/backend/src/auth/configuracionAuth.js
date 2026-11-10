import { MECANISMOS, RegistroDeProveedores } from "./RegistroDeProveedores.js";

const CAMPOS_OBLIGATORIOS = [
  "codigo",
  "mecanismo",
  "issuers",
  "audiencia",
  "jwksUri",
  "algoritmos",
];

function proveedorLogto(entorno) {
  const endpoint = entorno.LOGTO_ENDPOINT;
  const audiencia = entorno.LOGTO_API_RESOURCE;

  if (endpoint && audiencia) {
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

function validarProveedor(proveedor) {
  const faltantes = CAMPOS_OBLIGATORIOS.filter((campo) => {
    const valor = proveedor[campo];
    return Array.isArray(valor) ? valor.length === 0 : !valor;
  });
  if (faltantes.length > 0) {
    throw new Error(
      `Al proveedor "${proveedor.codigo ?? "?"}" le falta configurar: ${faltantes.join(", ")}`,
    );
  }
  if (!MECANISMOS[proveedor.mecanismo]) {
    throw new Error(`Mecanismo de autenticacion no soportado: ${proveedor.mecanismo}`);
  }
  if (proveedor.algoritmos.some((alg) => alg === "none" || alg.startsWith("HS"))) {
    throw new Error(`El proveedor "${proveedor.codigo}" no puede aceptar "none" ni HS*`);
  }
}

export function proveedoresDesdeEntorno(entorno = process.env) {
  const proveedores = entorno.AUTH_PROVEEDORES
    ? JSON.parse(entorno.AUTH_PROVEEDORES)
    : proveedorLogto(entorno);

  proveedores.forEach(validarProveedor);
  const codigos = proveedores.map((p) => p.codigo);
  if (new Set(codigos).size !== codigos.length) {
    throw new Error("Hay dos proveedores con el mismo codigo");
  }

  const sinAutenticacionPermitida =
    entorno.AUTH_DESACTIVADA === "true" || entorno.NODE_ENV === "test";
  if (proveedores.length === 0 && !sinAutenticacionPermitida) {
    throw new Error(
      "Falta configurar la autenticacion: LOGTO_ENDPOINT y LOGTO_API_RESOURCE " +
        "(o AUTH_PROVEEDORES). Para desarrollo sin login, AUTH_DESACTIVADA=true.",
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
