import mongoose from "mongoose";
import { IdentidadExternaModel } from "../../src/security/persistencia/IdentidadExternaModel.js";
import { UsuarioModel } from "../../src/security/persistencia/UsuarioModel.js";
import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";
import { ColectivoModel } from "../../src/models/ColectivoModel.js";
import { SolicitudIngresoModel } from "../../src/security/persistencia/SolicitudIngresoModel.js";
import { ColaboradorModel } from "../../src/models/ColaboradorModel.js";
import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";

const autenticadorDePrueba = {
  async autenticar(token) {
    if (!token.startsWith("cuenta-")) {
      throw new UnauthorizedError("La sesion no es valida o vencio", "TOKEN_INVALIDO");
    }
    return { proveedor: "prueba", sub: token };
  },
};

async function armar({ compat = false } = {}) {
  const { api, services } = await armarApp({
    autenticador: autenticadorDePrueba,
    compatContextoImplicito: compat,
  });
  const contextos = new Map();
  const token = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });
  const como = (cuenta, contextoId = contextos.get(cuenta)) =>
    contextoId ? { ...token(cuenta), "X-Context-Id": contextoId } : token(cuenta);
  const registrar = (cuenta) => api.post("/auth/registro").set(token(cuenta));
  const nombrar = async (cuenta, nombre = cuenta) => {
    await registrar(cuenta);
    return api.put("/auth/usuario").set(token(cuenta)).send({ nombre }).expect(200);
  };
  const yo = async (cuenta) => {
    const { body } = await api.get("/auth/me").set(token(cuenta)).expect(200);
    if (body.contextoActual) contextos.set(cuenta, body.contextoActual.id);
    else contextos.delete(cuenta);
    return body;
  };
  const crearColectivo = async (cuenta, nombre = `Colectivo de ${cuenta}`) => {
    await nombrar(cuenta);
    const { body } = await api
      .post("/colectivos")
      .set(token(cuenta))
      .send({ nombre, descripcion: "d", tipoColectivo: "ONG" })
      .expect(201);
    await yo(cuenta);
    return body;
  };
  const crearPersona = async (cuenta) => {
    await registrar(cuenta);
    const { body } = await api
      .post("/colaboradores")
      .set(token(cuenta))
      .send({ cuentaGit: cuenta, codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    await yo(cuenta);
    return body;
  };
  const solicitar = async (cuenta, colectivoId) => {
    await nombrar(cuenta);
    return (
      await api
        .post(`/colectivos/${colectivoId}/solicitudes-ingreso`)
        .set(token(cuenta))
        .expect(201)
    ).body;
  };
  const elegir = async (cuenta, contextoId) => {
    const { body } = await api
      .put("/auth/contexto-actual")
      .set(token(cuenta))
      .send({ contextoId })
      .expect(200);
    contextos.set(cuenta, contextoId);
    return body;
  };
  const unirse = async (lider, cuenta, colectivoId) => {
    const solicitud = await solicitar(cuenta, colectivoId);
    const { body } = await api
      .post(`/colectivos/${colectivoId}/solicitudes-ingreso/${solicitud.id}/aceptacion`)
      .set(como(lider))
      .expect(200);
    await elegir(cuenta, body.miembro.contextoId);
    return body.miembro.contextoId;
  };
  const lideres = async (lider, colectivoId) =>
    (
      await api.get(`/colectivos/${colectivoId}/miembros`).set(como(lider)).expect(200)
    ).body.filter((m) => m.rol === "LIDER");

  return {
    api,
    services,
    contextos,
    token,
    como,
    registrar,
    nombrar,
    yo,
    crearColectivo,
    crearPersona,
    solicitar,
    elegir,
    unirse,
    lideres,
  };
}

const codigo = (respuesta) => respuesta.body.codigo;

describe("HTTP · registro e identidad", () => {
  test("el registro es idempotente: pedidos simultaneos dejan un solo usuario", async () => {
    const { api, token, registrar } = await armar();

    expect(codigo(await api.post("/auth/registro").expect(401))).toBe("NO_AUTENTICADO");
    expect(
      codigo(
        await api.post("/auth/registro").set("Authorization", "Bearer x").expect(401),
      ),
    ).toBe("TOKEN_INVALIDO");
    expect(codigo(await api.get("/auth/me").set(token("ana")).expect(403))).toBe(
      "USUARIO_NO_REGISTRADO",
    );

    const respuestas = await Promise.all([1, 2, 3, 4, 5].map(() => registrar("ana")));
    expect(new Set(respuestas.map((r) => r.body.usuarioId)).size).toBe(1);
    expect(respuestas.filter((r) => r.status === 201)).toHaveLength(1);
    expect(respuestas.filter((r) => r.status === 200)).toHaveLength(4);
    expect(await IdentidadExternaModel.countDocuments()).toBe(1);
    expect(await UsuarioModel.countDocuments()).toBe(1);

    const { body } = await api.get("/auth/me").set(token("ana")).expect(200);
    expect(body).toMatchObject({
      id: "cuenta-ana",
      rol: null,
      perfilId: null,
      usuario: { id: respuestas[0].body.usuarioId, nombre: null, nombrePendiente: true },
      contextoActual: null,
      contextos: [],
    });
  });

  test("un fallo despues de ambas escrituras revierte el registro y permite reintentar", async () => {
    const { api, services, registrar, token } = await armar();
    const repositorio = services.registroService.usuarioRepository;
    const asegurar = repositorio.asegurar;
    repositorio.asegurar = async function (id) {
      await asegurar.call(this, id);
      throw new Error("falla inyectada en el registro");
    };

    await registrar("ana").expect(500);
    expect(await IdentidadExternaModel.countDocuments()).toBe(0);
    expect(await UsuarioModel.countDocuments()).toBe(0);
    await api.get("/auth/me").set(token("ana")).expect(403);

    repositorio.asegurar = asegurar;
    const { body } = await registrar("ana").expect(201);
    const identidad = await IdentidadExternaModel.findOne({
      proveedor: "prueba",
      sub: "cuenta-ana",
    });
    expect(String(identidad.usuarioId)).toBe(body.usuarioId);
    expect(await UsuarioModel.findById(body.usuarioId)).toMatchObject({ nombre: null });
  });

  test.each(["Basic abc", "Bearer", "Bearer cuenta-ana sobra"])(
    "un Authorization mal formado devuelve 401 tambien en una lectura publica (%s)",
    async (Authorization) => {
      const { api } = await armar({ compat: true });
      const respuesta = await api.get("/colectivos").set({ Authorization }).expect(401);
      expect(codigo(respuesta)).toBe("TOKEN_INVALIDO");
    },
  );

  test("la compatibilidad contextual no registra identidades ni omite el nombre", async () => {
    const { api, token, registrar } = await armar({ compat: true });
    const datos = { nombre: "Colectivo", descripcion: "d", tipoColectivo: "ONG" };
    await api.get("/auth/me").set(token("ana")).expect(403);
    await api.post("/colectivos").set(token("ana")).send(datos).expect(403);
    expect(await UsuarioModel.countDocuments()).toBe(0);
    await registrar("ana").expect(201);
    const respuesta = await api
      .post("/colectivos")
      .set(token("ana"))
      .send(datos)
      .expect(409);
    expect(codigo(respuesta)).toBe("NOMBRE_REQUERIDO");
  });
});

describe("HTTP · contexto en cada pedido", () => {
  test("se rechaza sin contexto, con uno ajeno, desactualizado o inactivo", async () => {
    const { api, token, como, crearColectivo, yo, elegir, contextos } = await armar();
    const a = await crearColectivo("ana", "A");
    const contextoA = contextos.get("ana");
    await crearColectivo("beto", "B");
    const cambio = { nombre: "Nuevo nombre" };

    expect(
      codigo(
        await api.put(`/colectivos/${a.id}`).set(token("ana")).send(cambio).expect(400),
      ),
    ).toBe("CONTEXTO_REQUERIDO");
    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(como("ana", "basura"))
          .send(cambio)
          .expect(400),
      ),
    ).toBe("CONTEXTO_REQUERIDO");
    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(como("ana", contextos.get("beto")))
          .send(cambio)
          .expect(403),
      ),
    ).toBe("CONTEXTO_INVALIDO");
    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(como("ana", String(new mongoose.Types.ObjectId())))
          .send(cambio)
          .expect(403),
      ),
    ).toBe("CONTEXTO_INVALIDO");

    // Otro colectivo propio pasa a ser el contexto actual: el de A queda viejo.
    await crearColectivo("ana", "C");
    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(como("ana", contextoA))
          .send(cambio)
          .expect(409),
      ),
    ).toBe("CONTEXTO_NO_ACTUAL");
    // Con el contexto de C tiene el permiso, pero A no es el colectivo de C.
    await api.put(`/colectivos/${a.id}`).set(como("ana")).send(cambio).expect(403);

    const elegido = await elegir("ana", contextoA);
    expect(elegido).toMatchObject({ rol: "LIDER", colectivo: { id: a.id } });
    expect(elegido.permisos).toContain("COLECTIVO_EDITAR");
    await api.put(`/colectivos/${a.id}`).set(como("ana")).send(cambio).expect(200);
    expect(
      codigo(
        await api
          .put("/auth/contexto-actual")
          .set(token("ana"))
          .send({ contextoId: contextos.get("beto") })
          .expect(403),
      ),
    ).toBe("CONTEXTO_INVALIDO");

    // La baja desactiva el contexto y lo saca de actual: se rechaza tanto
    // operar con el como volver a elegirlo.
    await api.post(`/colectivos/${a.id}/baja`).set(como("ana")).expect(200);
    expect(
      codigo(
        await api.put(`/colectivos/${a.id}`).set(como("ana")).send(cambio).expect(409),
      ),
    ).toBe("CONTEXTO_NO_ACTUAL");
    expect(
      codigo(
        await api
          .put("/auth/contexto-actual")
          .set(token("ana"))
          .send({ contextoId: contextoA })
          .expect(403),
      ),
    ).toBe("CONTEXTO_INACTIVO");
    const cuenta = await yo("ana");
    expect(cuenta.contextoActual).toBeNull();
    expect(cuenta.contextos.map((c) => c.colectivo.nombre)).toEqual(["C"]);
  });

  test.each(["baja", "inexistente"])(
    "rechaza el contexto actual si la entidad de colaboradora esta %s",
    async (estado) => {
      const { api, como, crearPersona, yo } = await armar();
      const perfil = await crearPersona("ana");
      const contexto = await ContextoUsuarioModel.findOne({ colaboradorId: perfil.id });
      if (estado === "baja") {
        await ColaboradorModel.updateOne(
          { _id: perfil.id },
          { $set: { fechaBaja: new Date() } },
        );
      } else {
        await ColaboradorModel.deleteOne({ _id: perfil.id });
      }
      const respuesta = await api
        .get("/colaboradores/" + perfil.id + "/notificaciones")
        .set(como("ana"))
        .expect(403);
      expect(codigo(respuesta)).toBe("CONTEXTO_INACTIVO");
      expect(await yo("ana")).toMatchObject({ contextoActual: null, contextos: [] });
      expect((await UsuarioModel.findById(contexto.usuarioId)).contextoActualId).toEqual(
        contexto._id,
      );
    },
  );

  test("cerrar sesion limpia el contexto actual en todas las ventanas", async () => {
    const { api, token, como, crearColectivo, yo } = await armar();
    const a = await crearColectivo("ana");

    await api.delete("/auth/contexto-actual").set(token("ana")).expect(204);
    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(como("ana"))
          .send({ nombre: "X" })
          .expect(409),
      ),
    ).toBe("CONTEXTO_NO_ACTUAL");
    const cuenta = await yo("ana");
    expect(cuenta.contextoActual).toBeNull();
    expect(cuenta.contextos).toHaveLength(1);
  });

  test("un colectivo creado desde otro contexto no queda asociado a ese", async () => {
    const { api, como, crearColectivo, yo } = await armar();
    const a = await crearColectivo("ana", "A");
    const { body: c } = await api
      .post("/colectivos")
      .set(como("ana"))
      .send({ nombre: "C", descripcion: "d", tipoColectivo: "ONG" })
      .expect(201);

    const cuenta = await yo("ana");
    expect(cuenta.contextoActual).toMatchObject({
      rol: "LIDER",
      colectivo: { id: c.id },
    });
    expect(cuenta.contextos.map((x) => [x.colectivo.id, x.rol])).toEqual([
      [a.id, "LIDER"],
      [c.id, "LIDER"],
    ]);
  });
});

describe("HTTP · nombre del usuario", () => {
  test("el nombre es propio de la app y se pide antes de mostrarse ante otros", async () => {
    const { api, token, registrar, crearColectivo, yo, como } = await armar();
    const a = await crearColectivo("ana");
    await registrar("caro");

    const alta = { nombre: "C", descripcion: "d", tipoColectivo: "ONG" };
    expect(
      codigo(await api.post("/colectivos").set(token("caro")).send(alta).expect(409)),
    ).toBe("NOMBRE_REQUERIDO");
    expect(
      codigo(
        await api
          .post(`/colectivos/${a.id}/solicitudes-ingreso`)
          .set(token("caro"))
          .expect(409),
      ),
    ).toBe("NOMBRE_REQUERIDO");

    await api.put("/auth/usuario").set(token("caro")).send({ nombre: "   " }).expect(400);
    await api
      .put("/auth/usuario")
      .set(token("caro"))
      .send({ nombre: "x", sub: "y" })
      .expect(400);
    const { body } = await api
      .put("/auth/usuario")
      .set(token("caro"))
      .send({ nombre: "  Caro Diaz " })
      .expect(200);
    expect(body.nombre).toBe("Caro Diaz");
    expect((await yo("caro")).usuario).toMatchObject({
      nombre: "Caro Diaz",
      nombrePendiente: false,
    });

    await api
      .post(`/colectivos/${a.id}/solicitudes-ingreso`)
      .set(token("caro"))
      .expect(201);
    await api
      .put("/auth/usuario")
      .set(token("caro"))
      .send({ nombre: "Carolina" })
      .expect(200);
    const bandeja = await api
      .get(`/colectivos/${a.id}/solicitudes-ingreso`)
      .set(como("ana"))
      .expect(200);
    expect(bandeja.body[0].usuario.nombre).toBe("Carolina");
  });

  test("el nombre de usuario y el nombre del perfil se persisten por separado", async () => {
    const { api, crearPersona, nombrar, yo } = await armar();
    const perfil = await crearPersona("ada");
    await nombrar("ada", "Ada Nombre Interno");
    const cuenta = await yo("ada");
    expect(cuenta.usuario.nombre).toBe("Ada Nombre Interno");
    expect(cuenta.contextoActual.colaborador.nombre).toBe("ada");
    expect(await UsuarioModel.findById(cuenta.usuario.id)).toMatchObject({
      nombre: "Ada Nombre Interno",
    });
    expect((await ColaboradorModel.findById(perfil.id)).nombreParaMostrar()).toBe("ada");
    await api.get("/colaboradores/" + perfil.id).expect(200);
  });
});

describe("HTTP · baja de colaboradora", () => {
  async function conProyecto() {
    const contexto = await armar();
    const { api, como, crearColectivo, crearPersona } = contexto;
    const colectivo = await crearColectivo("ana");
    const { body: proyecto } = await api
      .post(`/colectivos/${colectivo.id}/proyectos`)
      .set(como("ana"))
      .send({
        titulo: "Huerta",
        descripcion: "d",
        perfiles: [datosDePerfil({ modoAceptacion: "REVISION_MANUAL" })],
      })
      .expect(201);
    const ada = await crearPersona("ada");
    return { ...contexto, colectivo, proyecto, ada };
  }

  test("no se da de baja con postulaciones o colaboraciones en curso", async () => {
    const { api, como, token, proyecto, ada } = await conProyecto();
    const { body: postulacion } = await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .set(como("ada"))
      .send({ colaboradorId: ada.id, perfilId: proyecto.perfiles[0].id })
      .expect(201);
    const base = `/proyectos/${proyecto.id}/colaboraciones/${postulacion.id}`;
    const baja = () => api.post(`/colaboradores/${ada.id}/baja`).set(como("ada"));

    const pendiente = await baja().expect(409);
    expect(pendiente.body).toMatchObject({
      codigo: "ACTIVIDAD_EN_CURSO",
      detalle: [{ proyectoId: proyecto.id, proyecto: "Huerta", estado: "PENDIENTE" }],
    });
    expect(pendiente.body.message).toContain("1 postulacion(es) pendiente(s)");

    await api.post(`${base}/aceptacion`).set(como("ana")).expect(200);
    expect((await baja().expect(409)).body.detalle[0].estado).toBe("ACEPTADA");

    await api.post(`${base}/finalizacion`).set(como("ada")).expect(200);
    const { body } = await baja().expect(200);
    expect(body.fechaBaja).toBeTruthy();
    const { body: nuevo } = await api
      .post("/colaboradores")
      .set(token("ada"))
      .send({ cuentaGit: "ada-nuevo" })
      .expect(201);
    expect(nuevo.id).not.toBe(ada.id);
    expect(
      (await api.get(`/colaboradores/${ada.id}/colaboraciones`).expect(200)).body,
    ).toHaveLength(1);
    expect(
      (await api.get(`/colaboradores/${nuevo.id}/colaboraciones`).expect(200)).body,
    ).toEqual([]);
  });

  test("la misma cuenta puede dar de alta un perfil y contexto nuevos despues de la baja", async () => {
    const { api, token, como, proyecto, ada, crearPersona, yo, nombrar } =
      await conProyecto();
    const eva = await crearPersona("eva");
    const cuentaEva = await yo("eva");
    const perfil = `/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}`;
    const candidatas = async () =>
      (
        await api.get(`${perfil}/colaboradoras-potenciales`).set(como("ana")).expect(200)
      ).body.data.map((c) => c.colaborador.id);
    expect(await candidatas()).toEqual(expect.arrayContaining([ada.id, eva.id]));

    await api.post(`/colaboradores/${eva.id}/baja`).set(como("ada")).expect(403);
    await api.post(`/colaboradores/${eva.id}/baja`).set(como("eva")).expect(200);

    expect(await candidatas()).not.toContain(eva.id);
    expect(
      codigo(
        await api
          .post(`${perfil}/invitaciones`)
          .set(como("ana"))
          .send({ colaboradorId: eva.id })
          .expect(409),
      ),
    ).toBe("COLABORADORA_DADA_DE_BAJA");
    expect(
      (await api.get(`/colaboradores/${eva.id}`).expect(200)).body.fechaBaja,
    ).toBeTruthy();
    expect(await yo("eva")).toMatchObject({ contextoActual: null, contextos: [] });
    await api.post(`/colaboradores/${eva.id}/reactivacion`).set(token("eva")).expect(404);

    const registro = await api.post("/auth/registro").set(token("eva")).expect(200);
    expect(registro.body).toMatchObject({
      usuarioId: cuentaEva.usuario.id,
      creado: false,
    });
    expect(
      await ContextoUsuarioModel.findById(cuentaEva.contextoActual.id),
    ).toMatchObject({
      activo: false,
      colaboradorId: new mongoose.Types.ObjectId(eva.id),
    });

    const alta = (cuentaGit) =>
      api
        .post("/colaboradores")
        .set(token("eva"))
        .send({ cuentaGit, codigosHabilidades: [CODIGOS.node] });

    // Puede pasar a colectivo después de la baja de colaboradora.
    await nombrar("eva");
    const { body: suyo } = await api
      .post("/colectivos")
      .set(token("eva"))
      .send({ nombre: "De Eva", descripcion: "d", tipoColectivo: "ONG" })
      .expect(201);
    await yo("eva");
    expect(codigo(await alta("eva2").expect(409))).toBe("MODALIDAD_INCOMPATIBLE");

    await api.post(`/colectivos/${suyo.id}/baja`).set(como("eva")).expect(200);
    expect(await yo("eva")).toMatchObject({ contextoActual: null, contextos: [] });

    const altas = await Promise.all([alta("eva2"), alta("eva3")]);
    expect(altas.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(codigo(altas.find(({ status }) => status === 409))).toBe(
      "PERFIL_COLABORADOR_EXISTENTE",
    );
    const { body: nuevo } = altas.find(({ status }) => status === 201);
    const cuenta = await yo("eva");
    expect(nuevo.id).not.toBe(eva.id);
    expect(cuenta.usuario.id).toBe(cuentaEva.usuario.id);
    expect(cuenta.contextoActual).toMatchObject({ colaborador: { id: nuevo.id } });
    expect(cuenta.contextos).toEqual([cuenta.contextoActual]);
    expect(cuenta.contextoActual.id).not.toBe(cuentaEva.contextoActual.id);
    expect(
      await ContextoUsuarioModel.countDocuments({
        usuarioId: cuenta.usuario.id,
        tipo: "COLABORADOR",
      }),
    ).toBe(2);
    expect(
      await ContextoUsuarioModel.findById(cuentaEva.contextoActual.id),
    ).toMatchObject({
      activo: false,
      colaboradorId: new mongoose.Types.ObjectId(eva.id),
    });
    expect((await ColaboradorModel.findById(eva.id)).fechaBaja).toBeInstanceOf(Date);
    const seleccionAnterior = await api
      .put("/auth/contexto-actual")
      .set(token("eva"))
      .send({ contextoId: cuentaEva.contextoActual.id })
      .expect(403);
    expect(codigo(seleccionAnterior)).toBe("CONTEXTO_INACTIVO");
    expect(await candidatas()).not.toContain(eva.id);
    expect(await candidatas()).toContain(nuevo.id);
  });
});

describe("HTTP · modalidades", () => {
  test("no se opera a la vez como colaboradora y como colectivo", async () => {
    const { api, token, crearColectivo, crearPersona, nombrar } = await armar();
    const a = await crearColectivo("ana");
    await crearPersona("ada");
    await nombrar("ada");

    const alta = { nombre: "X", descripcion: "d", tipoColectivo: "ONG" };
    expect(
      codigo(await api.post("/colectivos").set(token("ada")).send(alta).expect(409)),
    ).toBe("MODALIDAD_INCOMPATIBLE");
    expect(
      codigo(
        await api
          .post(`/colectivos/${a.id}/solicitudes-ingreso`)
          .set(token("ada"))
          .expect(409),
      ),
    ).toBe("MODALIDAD_INCOMPATIBLE");
    expect(
      codigo(
        await api
          .post("/colaboradores")
          .set(token("ana"))
          .send({ cuentaGit: "ana" })
          .expect(409),
      ),
    ).toBe("MODALIDAD_INCOMPATIBLE");
    expect(
      codigo(
        await api
          .post("/colaboradores")
          .set(token("ada"))
          .send({ cuentaGit: "otra" })
          .expect(409),
      ),
    ).toBe("PERFIL_COLABORADOR_EXISTENTE");
  });

  test("cambia de modalidad cuando ya no le quedan contextos validos", async () => {
    const { api, token, como, crearColectivo, yo } = await armar();
    const a = await crearColectivo("ana");
    await api.post(`/colectivos/${a.id}/baja`).set(como("ana")).expect(200);

    const persona = await api
      .post("/colaboradores")
      .set(token("ana"))
      .send({ cuentaGit: "ana" })
      .expect(201);
    expect(await yo("ana")).toMatchObject({
      rol: "COLABORADORA",
      perfilId: persona.body.id,
      contextoActual: { tipo: "COLABORADOR", rol: "COLABORADOR" },
    });
  });
});

describe("HTTP · membresias", () => {
  test("solicitar, aceptar y operar con los permisos de miembro", async () => {
    const { api, token, como, crearColectivo, solicitar, yo, elegir } = await armar();
    const a = await crearColectivo("ana");
    const base = `/colectivos/${a.id}`;

    const solicitud = await solicitar("caro", a.id);
    expect(solicitud).toMatchObject({ estado: "PENDIENTE" });
    expect(
      codigo(
        await api.post(`${base}/solicitudes-ingreso`).set(token("caro")).expect(409),
      ),
    ).toBe("SOLICITUD_PENDIENTE");
    expect(
      (await api.get("/auth/solicitudes-ingreso").set(token("caro")).expect(200)).body,
    ).toHaveLength(1);
    await api.get(`${base}/solicitudes-ingreso`).set(token("caro")).expect(400);

    const bandeja = await api
      .get(`${base}/solicitudes-ingreso`)
      .set(como("ana"))
      .expect(200);
    expect(bandeja.body).toEqual([
      expect.objectContaining({
        id: solicitud.id,
        usuario: expect.objectContaining({ nombre: "caro" }),
      }),
    ]);

    const aceptada = await api
      .post(`${base}/solicitudes-ingreso/${solicitud.id}/aceptacion`)
      .set(como("ana"))
      .expect(200);
    expect(aceptada.body.miembro.rol).toBe("MIEMBRO");
    expect(
      codigo(
        await api
          .post(`${base}/solicitudes-ingreso/${solicitud.id}/aceptacion`)
          .set(como("ana"))
          .expect(409),
      ),
    ).toBe("SOLICITUD_YA_RESUELTA");

    const cuenta = await yo("caro");
    expect(cuenta.contextoActual).toBeNull();
    expect(cuenta.contextos).toEqual([
      expect.objectContaining({
        rol: "MIEMBRO",
        colectivo: { id: a.id, nombre: a.nombre },
      }),
    ]);
    await elegir("caro", aceptada.body.miembro.contextoId);

    await api
      .post(`${base}/proyectos`)
      .set(como("caro"))
      .send({ titulo: "P", descripcion: "d", perfiles: [datosDePerfil()] })
      .expect(201);
    const pendiente = await solicitar("dani", a.id);
    const solicitudes = await api
      .get(`${base}/solicitudes-ingreso?estado=PENDIENTE`)
      .set(como("caro"))
      .expect(200);
    expect(solicitudes.body).toMatchObject([{ id: pendiente.id, estado: "PENDIENTE" }]);
    for (const pedido of [
      () => api.put(base).set(como("caro")).send({ nombre: "X" }),
      () => api.get(`${base}/medios-de-contacto`).set(como("caro")),
      () => api.post(`${base}/baja`).set(como("caro")),
      () =>
        api
          .post(`${base}/solicitudes-ingreso/${pendiente.id}/aceptacion`)
          .set(como("caro")),
      () =>
        api.post(`${base}/solicitudes-ingreso/${pendiente.id}/rechazo`).set(como("caro")),
    ]) {
      expect(codigo(await pedido().expect(403))).toBe("PERMISO_INSUFICIENTE");
    }
    const despues = await api
      .get(`${base}/solicitudes-ingreso?estado=PENDIENTE`)
      .set(como("ana"))
      .expect(200);
    expect(despues.body).toMatchObject([{ id: pendiente.id, estado: "PENDIENTE" }]);
    const miembros = await api.get(`${base}/miembros`).set(como("caro")).expect(200);
    expect(miembros.body.map((m) => [m.nombre, m.rol])).toEqual([
      ["ana", "LIDER"],
      ["caro", "MIEMBRO"],
    ]);
    expect(
      codigo(
        await api.post(`${base}/solicitudes-ingreso`).set(token("caro")).expect(409),
      ),
    ).toBe("YA_ES_MIEMBRO");
  });

  test("ser lider de A y miembro de B nunca habilita administrar B", async () => {
    const { api, como, crearColectivo, solicitar, unirse, elegir, contextos } =
      await armar();
    const a = await crearColectivo("ana", "A");
    const contextoA = contextos.get("ana");
    const b = await crearColectivo("beto", "B");
    const contextoB = await unirse("beto", "ana", b.id);
    const contextoCaro = await unirse("beto", "caro", b.id);
    const pendiente = await solicitar("dani", b.id);
    const ruta = `/colectivos/${b.id}`;
    const solicitudes = `${ruta}/solicitudes-ingreso/${pendiente.id}`;
    const acciones = [
      () => api.post(`${ruta}/baja`),
      () => api.post(`${solicitudes}/aceptacion`),
      () => api.post(`${solicitudes}/rechazo`),
      () => api.delete(`${ruta}/miembros/${contextoCaro}`),
      () => api.post(`${ruta}/lider`).send({ contextoId: contextoCaro }),
    ];

    await elegir("ana", contextoA);
    for (const accion of acciones) await accion().set(como("ana")).expect(403);
    await api.get(`${ruta}/miembros`).set(como("ana")).expect(403);
    const rutaA = `/colectivos/${a.id}`;
    await api
      .post(`${rutaA}/solicitudes-ingreso/${pendiente.id}/aceptacion`)
      .set(como("ana"))
      .expect(404);
    await api
      .post(`${rutaA}/solicitudes-ingreso/${pendiente.id}/rechazo`)
      .set(como("ana"))
      .expect(404);
    await api.delete(`${rutaA}/miembros/${contextoCaro}`).set(como("ana")).expect(404);

    await elegir("ana", contextoB);
    const { body: miembros } = await api
      .get(`${ruta}/miembros`)
      .set(como("ana"))
      .expect(200);
    expect(miembros.map(({ nombre }) => nombre)).toEqual(["beto", "ana", "caro"]);
    await api.get(`${rutaA}/miembros`).set(como("ana")).expect(403);
    for (const accion of acciones) {
      expect(codigo(await accion().set(como("ana")).expect(403))).toBe(
        "PERMISO_INSUFICIENTE",
      );
      expect(codigo(await accion().set(como("ana", contextoA)).expect(409))).toBe(
        "CONTEXTO_NO_ACTUAL",
      );
    }
    expect((await ColectivoModel.findById(b.id)).fechaBaja).toBeNull();
    expect(await SolicitudIngresoModel.findById(pendiente.id)).toMatchObject({
      estado: "PENDIENTE",
    });
    expect(await ContextoUsuarioModel.findById(contextoCaro)).toMatchObject({
      activo: true,
      rol: "MIEMBRO",
    });
    expect(await ContextoUsuarioModel.findById(contextoB)).toMatchObject({
      activo: true,
      rol: "MIEMBRO",
    });
    expect(
      await ContextoUsuarioModel.countDocuments({
        colectivoId: b.id,
        activo: true,
        rol: "LIDER",
      }),
    ).toBe(1);
  });

  test("un cambio de contexto despues de M3 impide confirmar las cinco operaciones de lider", async () => {
    const { api, services, como, crearColectivo, solicitar, unirse, elegir, contextos } =
      await armar();
    const a = await crearColectivo("ana", "A");
    const contextoA = contextos.get("ana");
    await crearColectivo("ana", "B");
    const contextoB = contextos.get("ana");
    await elegir("ana", contextoA);
    const miembro = await unirse("ana", "caro", a.id);
    const pendiente = await solicitar("dani", a.id);
    const ruta = `/colectivos/${a.id}`;
    const solicitudes = `${ruta}/solicitudes-ingreso/${pendiente.id}`;
    const casos = [
      [services.membresiaService, "darDeBajaColectivo", () => api.post(`${ruta}/baja`)],
      [services.membresiaService, "aceptar", () => api.post(`${solicitudes}/aceptacion`)],
      [services.membresiaService, "rechazar", () => api.post(`${solicitudes}/rechazo`)],
      [
        services.membresiaService,
        "quitarMiembro",
        () => api.delete(`${ruta}/miembros/${miembro}`),
      ],
      [
        services.liderazgoService,
        "transferir",
        () => api.post(`${ruta}/lider`).send({ contextoId: miembro }),
      ],
    ];

    for (const [servicio, metodo, accion] of casos) {
      await elegir("ana", contextoA);
      const original = servicio[metodo];
      servicio[metodo] = async function (...args) {
        await elegir("ana", contextoB);
        return original.apply(this, args);
      };
      try {
        expect(codigo(await accion().set(como("ana")).expect(409))).toBe(
          "CONTEXTO_NO_ACTUAL",
        );
      } finally {
        servicio[metodo] = original;
      }
    }

    expect((await ColectivoModel.findById(a.id)).fechaBaja).toBeNull();
    const solicitud = await SolicitudIngresoModel.findById(pendiente.id);
    expect(solicitud.estado).toBe("PENDIENTE");
    expect(
      await ContextoUsuarioModel.countDocuments({
        colectivoId: a.id,
        usuarioId: solicitud.usuarioId,
      }),
    ).toBe(0);
    expect(await ContextoUsuarioModel.findById(miembro)).toMatchObject({
      activo: true,
      rol: "MIEMBRO",
    });
    expect(await ContextoUsuarioModel.findById(contextoA)).toMatchObject({
      activo: true,
      rol: "LIDER",
    });
    const lider = await ContextoUsuarioModel.findById(contextoA);
    expect(String((await UsuarioModel.findById(lider.usuarioId)).contextoActualId)).toBe(
      contextoB,
    );
  });

  test("rechazar y cancelar dejan la solicitud resuelta una sola vez", async () => {
    const { api, token, como, crearColectivo, solicitar } = await armar();
    const a = await crearColectivo("ana");
    const base = `/colectivos/${a.id}/solicitudes-ingreso`;

    const primera = await solicitar("dani", a.id);
    const rechazo = await api
      .post(`${base}/${primera.id}/rechazo`)
      .set(como("ana"))
      .expect(200);
    expect(rechazo.body.estado).toBe("RECHAZADA");
    const repetido = await api
      .post(`${base}/${primera.id}/rechazo`)
      .set(como("ana"))
      .expect(409);
    expect(codigo(repetido)).toBe("SOLICITUD_YA_RESUELTA");

    const segunda = await solicitar("dani", a.id);
    await api.post(`${base}/${segunda.id}/cancelacion`).set(token("ana")).expect(404);
    const cancelada = await api
      .post(`${base}/${segunda.id}/cancelacion`)
      .set(token("dani"))
      .expect(200);
    expect(cancelada.body.estado).toBe("CANCELADA");
    await api.post(`${base}/${segunda.id}/aceptacion`).set(como("ana")).expect(409);
  });

  test("quien abandona o es quitado pierde el contexto, y al volver se reactiva", async () => {
    const { api, token, como, crearColectivo, unirse, contextos } = await armar();
    const a = await crearColectivo("ana");
    const base = `/colectivos/${a.id}`;
    const contextoCaro = await unirse("ana", "caro", a.id);

    await api.post(`${base}/abandono`).set(como("caro")).expect(204);
    expect(codigo(await api.get(`${base}/miembros`).set(como("caro")).expect(409))).toBe(
      "CONTEXTO_NO_ACTUAL",
    );
    expect(
      codigo(
        await api
          .put("/auth/contexto-actual")
          .set(token("caro"))
          .send({ contextoId: contextoCaro })
          .expect(403),
      ),
    ).toBe("CONTEXTO_INACTIVO");

    expect(await unirse("ana", "caro", a.id)).toBe(contextoCaro);
    expect(contextos.get("caro")).toBe(contextoCaro);

    await api
      .delete(`${base}/miembros/${contextos.get("ana")}`)
      .set(como("ana"))
      .expect(409);
    await api
      .delete(`${base}/miembros/${new mongoose.Types.ObjectId()}`)
      .set(como("ana"))
      .expect(404);
    await api.delete(`${base}/miembros/${contextoCaro}`).set(como("caro")).expect(403);
    await api.delete(`${base}/miembros/${contextoCaro}`).set(como("ana")).expect(204);
    const anterior = await ContextoUsuarioModel.findById(contextoCaro);
    expect(anterior).toMatchObject({ activo: false, fechaBaja: expect.any(Date) });
    expect((await UsuarioModel.findById(anterior.usuarioId)).contextoActualId).toBeNull();
    await api
      .put("/auth/contexto-actual")
      .set(token("caro"))
      .send({ contextoId: contextoCaro })
      .expect(403);
  });

  test("la baja del colectivo cierra sus membresias y conserva la historia", async () => {
    const { api, token, como, crearColectivo, unirse, solicitar, yo } = await armar();
    const a = await crearColectivo("ana");
    await unirse("ana", "caro", a.id);
    await solicitar("dani", a.id);

    await api.post(`/colectivos/${a.id}/baja`).set(como("caro")).expect(403);
    await api.post(`/colectivos/${a.id}/baja`).set(como("ana")).expect(200);

    for (const cuenta of ["ana", "caro"]) {
      expect(await yo(cuenta)).toMatchObject({ contextoActual: null, contextos: [] });
    }
    const [solicitudDeDani] = (
      await api.get("/auth/solicitudes-ingreso").set(token("dani")).expect(200)
    ).body;
    expect(solicitudDeDani.estado).toBe("CANCELADA");
    expect(
      (await api.get(`/colectivos/${a.id}`).expect(200)).body.fechaBaja,
    ).toBeTruthy();
  });

  test("el lider no abandona sin pasar el liderazgo", async () => {
    const { api, como, crearColectivo, unirse } = await armar();
    const a = await crearColectivo("ana");

    expect(
      codigo(await api.post(`/colectivos/${a.id}/abandono`).set(como("ana")).expect(409)),
    ).toBe("LIDER_UNICO_MIEMBRO");
    await unirse("ana", "caro", a.id);
    expect(
      codigo(await api.post(`/colectivos/${a.id}/abandono`).set(como("ana")).expect(409)),
    ).toBe("LIDER_DEBE_TRANSFERIR");
  });

  test("el liderazgo pasa de forma atomica y siempre queda un solo lider", async () => {
    const { api, como, crearColectivo, unirse, contextos, lideres } = await armar();
    const a = await crearColectivo("ana");
    await crearColectivo("beto");
    const base = `/colectivos/${a.id}`;
    const contextoCaro = await unirse("ana", "caro", a.id);
    const contextoDani = await unirse("ana", "dani", a.id);

    expect(
      codigo(
        await api
          .post(`${base}/lider`)
          .set(como("ana"))
          .send({ contextoId: contextos.get("beto") })
          .expect(404),
      ),
    ).toBe("DESTINO_INVALIDO");
    await api
      .post(`${base}/lider`)
      .set(como("ana"))
      .send({ contextoId: contextos.get("ana") })
      .expect(404);
    await api
      .post(`${base}/lider`)
      .set(como("caro"))
      .send({ contextoId: contextoDani })
      .expect(403);

    const respuestas = await Promise.all(
      [contextoCaro, contextoDani].map((contextoId) =>
        api.post(`${base}/lider`).set(como("ana")).send({ contextoId }),
      ),
    );
    // El segundo pedido se rechaza: o ya no encuentra a ana como lider al
    // validar el permiso (403), o choca al degradarla (409).
    const [ok, rechazado] = respuestas.map((r) => r.status).sort();
    expect(ok).toBe(200);
    expect([403, 409]).toContain(rechazado);
    const nuevos = await lideres("caro", a.id);
    expect(nuevos).toHaveLength(1);

    const nuevoLider = nuevos[0].nombre;
    await api.put(base).set(como("ana")).send({ nombre: "X" }).expect(403);
    await api.put(base).set(como(nuevoLider)).send({ nombre: "X" }).expect(200);
  });
});

describe("HTTP · compatibilidad transitoria sin X-Context-Id", () => {
  test("solo con un unico contexto valido que ademas es el actual", async () => {
    const { api, token, crearColectivo, registrar } = await armar({ compat: true });

    await registrar("nuevo").expect(201);
    const yo = await api.get("/auth/me").set(token("nuevo")).expect(200);
    expect(yo.body.usuario.id).toBeTruthy();

    const a = await crearColectivo("ana");
    const implicito = await api
      .put(`/colectivos/${a.id}`)
      .set(token("ana"))
      .send({ nombre: "X" });
    expect(implicito.status).toBe(200);
    expect(implicito.headers.deprecation).toBe("true");

    await api.delete("/auth/contexto-actual").set(token("ana")).expect(204);
    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(token("ana"))
          .send({ nombre: "Y" })
          .expect(400),
      ),
    ).toBe("CONTEXTO_REQUERIDO");

    await crearColectivo("ana", "Otro");
    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(token("ana"))
          .send({ nombre: "Y" })
          .expect(400),
      ),
    ).toBe("CONTEXTO_REQUERIDO");
  });

  test("un encabezado presente se valida completo aunque la compatibilidad este activa", async () => {
    const { api, como, crearColectivo, contextos } = await armar({ compat: true });
    const a = await crearColectivo("ana", "A");
    const viejo = contextos.get("ana");
    await crearColectivo("ana", "B");

    expect(
      codigo(
        await api
          .put(`/colectivos/${a.id}`)
          .set(como("ana", viejo))
          .send({ nombre: "Z" })
          .expect(409),
      ),
    ).toBe("CONTEXTO_NO_ACTUAL");
  });
});
