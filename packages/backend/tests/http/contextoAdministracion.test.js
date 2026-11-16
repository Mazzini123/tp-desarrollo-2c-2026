import { armarApp } from "./app.js";
import { CODIGOS } from "../fixtures.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";
import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";

const autenticadorDePrueba = {
  async autenticar(token) {
    if (!token.startsWith("cuenta-")) {
      throw new UnauthorizedError("La sesion no es valida o vencio", "TOKEN_INVALIDO");
    }
    return { proveedor: "prueba", sub: token };
  },
};

async function armar() {
  const { api, services } = await armarApp({ autenticador: autenticadorDePrueba });
  const token = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });
  const como = (cuenta, contextoId) => ({
    ...token(cuenta),
    "X-Context-Id": contextoId,
  });
  const registrar = async (cuenta) => {
    await api.post("/auth/registro").set(token(cuenta));
    await api.put("/auth/usuario").set(token(cuenta)).send({ nombre: cuenta });
    const { body } = await api.get("/auth/me").set(token(cuenta)).expect(200);
    return body.usuario.id;
  };
  const yo = async (cuenta) => (await api.get("/auth/me").set(token(cuenta))).body;
  const elegir = (cuenta, contextoId) =>
    api.put("/auth/contexto-actual").set(token(cuenta)).send({ contextoId });
  const otorgar = (usuarioId) => services.administradorService.otorgar({ usuarioId });
  return { api, services, token, como, registrar, yo, elegir, otorgar };
}

const delTipo = (cuenta, tipo) => cuenta.contextos.find((c) => c.tipo === tipo);

describe("HTTP · contexto de administracion", () => {
  test("otorgar el rol crea un contexto ADMINISTRACION sin colectivo ni colaboradora", async () => {
    const { registrar, otorgar, yo } = await armar();
    const usuarioId = await registrar("ana");

    expect(await otorgar(usuarioId)).toMatchObject({ creado: true });

    const cuenta = await yo("ana");
    expect(cuenta.contextos).toHaveLength(1);
    expect(cuenta.contextos[0]).toMatchObject({
      tipo: "ADMINISTRACION",
      rol: "ADMIN",
      colectivo: null,
      colaborador: null,
    });
    expect(cuenta.contextos[0].permisos.sort()).toEqual(
      [
        "ADMIN_GESTIONAR",
        "AUDITORIA_VER",
        "BAJA_POR_INFRACCION",
        "PROYECTO_DESTACAR",
        "REVISION_RESOLVER",
        "REVISION_VER",
        "TERMINOS_GESTIONAR",
      ].sort(),
    );
  });

  test("otorgarlo dos veces no duplica el contexto", async () => {
    const { registrar, otorgar, yo } = await armar();
    const usuarioId = await registrar("ana");

    await otorgar(usuarioId);
    expect(await otorgar(usuarioId)).toMatchObject({ creado: false });

    expect((await yo("ana")).contextos).toHaveLength(1);
    expect(await ContextoUsuarioModel.countDocuments({ usuarioId })).toBe(1);
  });

  test("no se puede otorgar a un usuario que no existe", async () => {
    const { otorgar } = await armar();
    await expect(otorgar("64b000000000000000000001")).rejects.toMatchObject({
      status: 404,
    });
  });

  test("una cuenta con los tres contextos cambia entre ellos y cada pedido opera con el suyo", async () => {
    const { api, token, como, registrar, otorgar, yo, elegir } = await armar();
    const usuarioId = await registrar("ana");
    await otorgar(usuarioId);
    await api
      .post("/colaboradores")
      .set(token("ana"))
      .send({ cuentaGit: "ana", codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    await api
      .post("/colectivos")
      .set(token("ana"))
      .send({ nombre: "Colectivo de Ana", descripcion: "d", tipoColectivo: "ONG" })
      .expect(201);

    const cuenta = await yo("ana");
    expect(cuenta.contextos.map((c) => c.tipo).sort()).toEqual([
      "ADMINISTRACION",
      "COLABORADOR",
      "COLECTIVO",
    ]);
    const admin = delTipo(cuenta, "ADMINISTRACION");
    const persona = delTipo(cuenta, "COLABORADOR");
    const colectivo = delTipo(cuenta, "COLECTIVO");

    await elegir("ana", admin.id).expect(200);
    expect((await yo("ana")).contextoActual.tipo).toBe("ADMINISTRACION");

    await api
      .get(`/colaboradores/${persona.colaborador.id}/notificaciones`)
      .set(como("ana", admin.id))
      .expect(403)
      .expect((r) => expect(r.body.codigo).toBe("PERMISO_INSUFICIENTE"));
    await api
      .post(`/colectivos/${colectivo.colectivo.id}/baja`)
      .set(como("ana", admin.id))
      .expect(403)
      .expect((r) => expect(r.body.codigo).toBe("PERMISO_INSUFICIENTE"));

    await elegir("ana", persona.id).expect(200);
    await api
      .get(`/colaboradores/${persona.colaborador.id}/notificaciones`)
      .set(como("ana", persona.id))
      .expect(200);
    await api
      .get(`/colaboradores/${persona.colaborador.id}/notificaciones`)
      .set(como("ana", admin.id))
      .expect(409)
      .expect((r) => expect(r.body.codigo).toBe("CONTEXTO_NO_ACTUAL"));
  });

  test("un administrador no puede postularse desde el contexto de administracion", async () => {
    const { api, como, registrar, otorgar, yo, elegir } = await armar();
    const usuarioId = await registrar("ana");
    await otorgar(usuarioId);
    const admin = delTipo(await yo("ana"), "ADMINISTRACION");
    await elegir("ana", admin.id).expect(200);

    await api
      .post("/proyectos/64b000000000000000000001/colaboraciones")
      .set(como("ana", admin.id))
      .send({
        colaboradorId: "64b000000000000000000003",
        perfilId: "64b000000000000000000002",
      })
      .expect(403)
      .expect((r) => expect(r.body.codigo).toBe("PERMISO_INSUFICIENTE"));
  });

  test("un administrador con perfil de colaboradora conserva sus permisos de colaboradora", async () => {
    const { api, token, como, registrar, otorgar, yo, elegir } = await armar();
    const usuarioId = await registrar("ana");
    await api
      .post("/colaboradores")
      .set(token("ana"))
      .send({ cuentaGit: "ana", codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    await otorgar(usuarioId);

    const persona = delTipo(await yo("ana"), "COLABORADOR");
    await elegir("ana", persona.id).expect(200);
    await api
      .get(`/colaboradores/${persona.colaborador.id}/proyectos-potenciales`)
      .set(como("ana", persona.id))
      .expect(200);
  });
});
