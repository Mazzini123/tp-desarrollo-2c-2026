import { crearAutorizacion } from "../../src/middlewares/autorizacion.js";
import { TIPO_CONTEXTO } from "../../src/security/autorizacion/enums/TIPO_CONTEXTO.js";

const USUARIO_ID = "u1";

function armar({ colaboradorId = "c1", duenoDeLaPerfil = USUARIO_ID } = {}) {
  const autorizacion = crearAutorizacion({
    autenticador: {},
    registroService: {},
    contextoService: { usuarioIdDeColaborador: async () => duenoDeLaPerfil },
    catalogoDeRoles: {},
    proyectoService: {
      colectivoIdDe: async () => "col1",
      colaboradorIdDe: async () => colaboradorId,
    },
  });
  return autorizacion;
}

const pedido = (contexto, autor) => ({
  usuario: { _id: USUARIO_ID },
  contexto,
  params: { id: "p1", colaboracionId: "k1" },
  body: { autor },
});

const colectivo = { tipo: TIPO_CONTEXTO.COLECTIVO, colectivoId: "col1" };
const colaboradora = { tipo: TIPO_CONTEXTO.COLABORADOR, colaboradorId: "c1" };

function correr(middleware, req) {
  return new Promise((resolver) => {
    Promise.resolve(middleware(req, {}, (error) => resolver(error ?? null))).catch(
      resolver,
    );
  });
}

describe("colaboracionAjena", () => {
  test("rechaza con COLABORACION_PROPIA si la colaboracion es de la misma cuenta y actua como colectivo", async () => {
    const error = await correr(armar().colaboracionAjena, pedido(colectivo));

    expect(error.codigo).toBe("COLABORACION_PROPIA");
    expect(error.statusCode ?? error.status).toBe(422);
  });

  test("deja pasar si actua como colaboradora", async () => {
    expect(await correr(armar().colaboracionAjena, pedido(colaboradora))).toBeNull();
  });

  test("deja pasar si la colaboracion es de otra cuenta", async () => {
    const autorizacion = armar({ duenoDeLaPerfil: "otra" });

    expect(await correr(autorizacion.colaboracionAjena, pedido(colectivo))).toBeNull();
  });

  test("deja pasar si la colaboracion es anonima", async () => {
    const autorizacion = armar({ colaboradorId: null });

    expect(await correr(autorizacion.colaboracionAjena, pedido(colectivo))).toBeNull();
  });

  test("la valoracion como colectivo de la propia colaboracion se rechaza y como colaboradora no", async () => {
    const { autorDeLaValoracion } = armar();

    const comoColectivo = await correr(
      autorDeLaValoracion,
      pedido(colectivo, "COLECTIVO"),
    );
    const comoColaboradora = await correr(
      autorDeLaValoracion,
      pedido(colaboradora, "COLABORADOR"),
    );

    expect(comoColectivo.codigo).toBe("COLABORACION_PROPIA");
    expect(comoColaboradora).toBeNull();
  });
});
