import http from "node:http";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { RegistroDeProveedores } from "../../src/auth/RegistroDeProveedores.js";
import {
  crearAutenticador,
  proveedoresDesdeEntorno,
} from "../../src/auth/configuracionAuth.js";

const AUDIENCIA = "https://api.codigo-a-voluntad";

let servidor;
let base;
const jwksPorRuta = new Map();
const clavesDe = {};

async function claveNueva(kid, alg = "ES384") {
  const par = await generateKeyPair(alg);
  const publica = { ...(await exportJWK(par.publicKey)), kid, alg, use: "sig" };
  return { ...par, kid, alg, publica };
}

function publicar(ruta, ...claves) {
  jwksPorRuta.set(ruta, { keys: claves.map((c) => c.publica) });
}

function firmar(
  clave,
  { emisor, audiencia = AUDIENCIA, sub = "usuario-1", expira = "5m", noAntes } = {},
) {
  const jwt = new SignJWT({})
    .setProtectedHeader({ alg: clave.alg, kid: clave.kid })
    .setIssuer(emisor)
    .setAudience(audiencia)
    .setIssuedAt()
    .setExpirationTime(expira);
  if (sub) jwt.setSubject(sub);
  if (noAntes) jwt.setNotBefore(noAntes);
  return jwt.sign(clave.privateKey);
}

function proveedor(codigo, extra = {}) {
  return {
    codigo,
    mecanismo: "OIDC_JWT",
    issuers: [`${base}/${codigo}`],
    audiencia: AUDIENCIA,
    jwksUri: `${base}/${codigo}/jwks`,
    algoritmos: ["ES384"],
    cooldownJwksMs: 0,
    ...extra,
  };
}

beforeAll(async () => {
  clavesDe.a = await claveNueva("a1");
  clavesDe.b = await claveNueva("b1");
  servidor = http.createServer((req, res) => {
    if (req.url === "/caido/jwks") {
      res.statusCode = 500;
      res.end();
      return;
    }
    const jwks = jwksPorRuta.get(req.url);
    if (!jwks) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(jwks));
  });
  await new Promise((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  base = `http://127.0.0.1:${servidor.address().port}`;
  publicar("/a/jwks", clavesDe.a);
  publicar("/b/jwks", clavesDe.b);
});

afterAll(() => new Promise((resolver) => servidor.close(resolver)));

const rechazo = (status, codigo) => expect.objectContaining({ status, codigo });

describe("validacion de access tokens", () => {
  test("un token valido devuelve el proveedor (por codigo) y el sub", async () => {
    const registro = new RegistroDeProveedores([proveedor("a"), proveedor("b")]);
    const token = await firmar(clavesDe.a, { emisor: `${base}/a` });

    await expect(registro.autenticar(token)).resolves.toMatchObject({
      proveedor: "a",
      sub: "usuario-1",
    });
  });

  test.each([
    ["otra audiencia", { audiencia: "https://otra-api" }],
    ["un token vencido", { expira: "-1m" }],
    ["un token sin sub", { sub: null }],
    ["un nbf en el futuro", { noAntes: "10m" }],
  ])("rechaza %s con 401 TOKEN_INVALIDO", async (_caso, cambios) => {
    const registro = new RegistroDeProveedores([proveedor("a")]);
    const token = await firmar(clavesDe.a, { emisor: `${base}/a`, ...cambios });

    await expect(registro.autenticar(token)).rejects.toEqual(
      rechazo(401, "TOKEN_INVALIDO"),
    );
  });

  test("un emisor no configurado, un iss falso y un texto que no es JWT son 401", async () => {
    const registro = new RegistroDeProveedores([proveedor("a"), proveedor("b")]);

    await expect(
      registro.autenticar(
        await firmar(clavesDe.a, { emisor: "https://otro.logto.app/oidc" }),
      ),
    ).rejects.toEqual(rechazo(401, "TOKEN_INVALIDO"));
    // Dice venir de "a" pero lo firmo la clave de "b".
    await expect(
      registro.autenticar(await firmar(clavesDe.b, { emisor: `${base}/a` })),
    ).rejects.toEqual(rechazo(401, "TOKEN_INVALIDO"));
    await expect(registro.autenticar("basura")).rejects.toEqual(
      rechazo(401, "TOKEN_INVALIDO"),
    );
  });

  test("rechaza un algoritmo fuera de la lista aunque la clave este publicada", async () => {
    const es256 = await claveNueva("a-es256", "ES256");
    publicar("/a/jwks", clavesDe.a, es256);
    const registro = new RegistroDeProveedores([proveedor("a")]);

    await expect(
      registro.autenticar(await firmar(es256, { emisor: `${base}/a` })),
    ).rejects.toEqual(rechazo(401, "TOKEN_INVALIDO"));
    publicar("/a/jwks", clavesDe.a);
  });

  test("ante una clave rotada vuelve a pedir el JWKS y la acepta", async () => {
    const registro = new RegistroDeProveedores([proveedor("a")]);
    await registro.autenticar(await firmar(clavesDe.a, { emisor: `${base}/a` }));

    const nueva = await claveNueva("a2");
    publicar("/a/jwks", clavesDe.a, nueva);
    await expect(
      registro.autenticar(await firmar(nueva, { emisor: `${base}/a` })),
    ).resolves.toMatchObject({ sub: "usuario-1" });
    publicar("/a/jwks", clavesDe.a);
  });

  test("si el JWKS no responde es 503, no 401", async () => {
    const caido = new RegistroDeProveedores([
      proveedor("caido", { jwksUri: `${base}/caido/jwks` }),
    ]);
    const inalcanzable = new RegistroDeProveedores([
      proveedor("lejos", { jwksUri: "http://127.0.0.1:1/jwks" }),
    ]);

    await expect(
      caido.autenticar(await firmar(clavesDe.a, { emisor: `${base}/caido` })),
    ).rejects.toEqual(rechazo(503, "PROVEEDOR_NO_DISPONIBLE"));
    await expect(
      inalcanzable.autenticar(await firmar(clavesDe.a, { emisor: `${base}/lejos` })),
    ).rejects.toEqual(rechazo(503, "PROVEEDOR_NO_DISPONIBLE"));
  });
});

describe("configuracion de proveedores", () => {
  const logto = {
    LOGTO_ENDPOINT: "https://x.logto.app/",
    LOGTO_API_RESOURCE: AUDIENCIA,
  };

  test("sin configuracion no arranca, salvo que se desactive explicitamente", () => {
    expect(() => proveedoresDesdeEntorno({})).toThrow();
    expect(() => proveedoresDesdeEntorno({ NODE_ENV: "production" })).toThrow();
    expect(() => proveedoresDesdeEntorno({ NODE_ENV: "development" })).toThrow();
    expect(proveedoresDesdeEntorno({ AUTH_DESACTIVADA: "true" })).toEqual([]);
    expect(proveedoresDesdeEntorno({ NODE_ENV: "test" })).toEqual([]);
    expect(crearAutenticador([])).toBeNull();
  });

  test("las variables de Logto arman un proveedor OIDC con su emisor y JWKS", () => {
    expect(() =>
      proveedoresDesdeEntorno({ LOGTO_ENDPOINT: "https://x.logto.app" }),
    ).toThrow();
    expect(proveedoresDesdeEntorno(logto)).toEqual([
      expect.objectContaining({
        codigo: "logto",
        mecanismo: "OIDC_JWT",
        issuers: ["https://x.logto.app/oidc"],
        jwksUri: "https://x.logto.app/oidc/jwks",
        audiencia: AUDIENCIA,
        algoritmos: ["ES384"],
      }),
    ]);
  });

  test("rechaza configuraciones inseguras o incompletas", () => {
    const conAlgoritmos = (algoritmos) =>
      JSON.stringify([{ ...proveedor("a"), algoritmos }]);

    expect(() =>
      proveedoresDesdeEntorno({ AUTH_PROVEEDORES: conAlgoritmos(["HS256"]) }),
    ).toThrow();
    expect(() =>
      proveedoresDesdeEntorno({ AUTH_PROVEEDORES: conAlgoritmos(["none"]) }),
    ).toThrow();
    expect(() =>
      proveedoresDesdeEntorno({
        AUTH_PROVEEDORES: JSON.stringify([{ ...proveedor("a"), audiencia: "" }]),
      }),
    ).toThrow();
    expect(() =>
      proveedoresDesdeEntorno({
        AUTH_PROVEEDORES: JSON.stringify([{ ...proveedor("a"), mecanismo: "SAML" }]),
      }),
    ).toThrow();
  });

  test("no arranca si todos los proveedores estan deshabilitados en el catalogo", () => {
    const proveedores = proveedoresDesdeEntorno(logto);
    expect(() => crearAutenticador(proveedores, [])).toThrow();
    expect(crearAutenticador(proveedores, ["logto"])).toBeInstanceOf(
      RegistroDeProveedores,
    );
  });
});
