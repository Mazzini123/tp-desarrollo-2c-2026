import http from "node:http";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { crearVerificadorLogto } from "../../src/auth/verificadorLogto.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";

const AUDIENCIA = "https://api.codigo-a-voluntad";

let servidor;
let endpoint;
let claves;
let verificador;

async function nuevoParDeClaves() {
  return generateKeyPair("ES384");
}

async function firmar(
  clavePrivada,
  {
    emisor = `${endpoint}/oidc`,
    audiencia = AUDIENCIA,
    sub = "usuario-1",
    expira = "5m",
  } = {},
) {
  const jwt = new SignJWT({})
    .setProtectedHeader({ alg: "ES384", kid: "k1" })
    .setIssuer(emisor)
    .setAudience(audiencia)
    .setIssuedAt();
  if (sub) jwt.setSubject(sub);
  jwt.setExpirationTime(expira);
  return jwt.sign(clavePrivada);
}

beforeAll(async () => {
  claves = await nuevoParDeClaves();
  const jwk = {
    ...(await exportJWK(claves.publicKey)),
    kid: "k1",
    alg: "ES384",
    use: "sig",
  };
  servidor = http.createServer((req, res) => {
    if (req.url === "/oidc/jwks") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  endpoint = `http://127.0.0.1:${servidor.address().port}`;
  verificador = crearVerificadorLogto({ endpoint: `${endpoint}/`, audiencia: AUDIENCIA });
});

afterAll(() => new Promise((resolver) => servidor.close(resolver)));

describe("verificador de tokens de Logto", () => {
  test("acepta un token firmado por el tenant, con emisor y audiencia correctos", async () => {
    const token = await firmar(claves.privateKey);
    await expect(verificador.verificar(token)).resolves.toEqual({ sub: "usuario-1" });
  });

  test.each([
    ["otra audiencia", { audiencia: "https://otra-api" }],
    ["otro emisor", { emisor: "https://otro.logto.app/oidc" }],
    ["un token vencido", { expira: "-1m" }],
    ["un token sin sub", { sub: null }],
  ])("rechaza %s", async (_nombre, cambios) => {
    const token = await firmar(claves.privateKey, cambios);
    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test("rechaza un token firmado con otra clave y un texto que no es un JWT", async () => {
    const ajena = await nuevoParDeClaves();
    await expect(
      verificador.verificar(await firmar(ajena.privateKey)),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(verificador.verificar("basura")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
