import { armarAdministracion, enDias } from "./soporteAdministracion.js";
import { datosDePerfil } from "../fixtures.js";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { RevisionModel } from "../../src/models/RevisionModel.js";
import { AvisoPendienteModel } from "../../src/models/AvisoPendienteModel.js";
import { AccionAdministrativaModel } from "../../src/models/AccionAdministrativaModel.js";

const ids = (lista) => lista.map((p) => p.id);
const codigo = (respuesta) => respuesta.body.codigo;

async function escenario() {
  const t = await armarAdministracion();
  const colectivo = await t.lideraUnColectivo("lider");
  const crear = (cuerpo = {}) =>
    t.api
      .post(`/colectivos/${colectivo.id}/proyectos`)
      .set(t.como("lider"))
      .send({
        titulo: "Proyecto",
        descripcion: "Descripcion",
        perfiles: [datosDePerfil()],
        ...cuerpo,
      });
  const pedirPublicacion = (id, cuenta = "lider") =>
    t.api.post(`/proyectos/${id}/publicacion`).set(t.como(cuenta));

  const publicado = (await crear({ titulo: "Publicado" }).expect(201)).body;
  const borrador = (await crear({ titulo: "Borrador", borrador: true }).expect(201)).body;
  const enRevision = (await crear({ titulo: "En revision", borrador: true }).expect(201))
    .body;
  await pedirPublicacion(enRevision.id).expect(200);
  const ocultos = [borrador.id, enRevision.id];

  const revisionDe = async (proyectoId) =>
    RevisionModel.findOne({ proyectoId, motivo: "PUBLICACION" }).lean();
  const resolver = (revisionId, cuerpo, cuenta = "root") =>
    t.api
      .post(`/administracion/revisiones/${revisionId}/resolucion`)
      .set(t.como(cuenta))
      .send(cuerpo);

  return {
    t,
    colectivo,
    crear,
    pedirPublicacion,
    publicado,
    borrador,
    enRevision,
    ocultos,
    revisionDe,
    resolver,
  };
}

describe("HTTP · borradores · creacion", () => {
  test("sin borrador el proyecto se publica directo y encola el aviso, como hoy", async () => {
    const { publicado } = await escenario();
    expect(publicado.estado).toBe("ABIERTO");
    expect(await AvisoPendienteModel.countDocuments({ entidadId: publicado.id })).toBe(1);
  });

  test("con borrador: true nace BORRADOR y no avisa a nadie", async () => {
    const { borrador } = await escenario();
    expect(borrador.estado).toBe("BORRADOR");
    expect(await AvisoPendienteModel.countDocuments({ entidadId: borrador.id })).toBe(0);
  });

  test("borrador tiene que ser booleano", async () => {
    const { crear } = await escenario();
    expect((await crear({ borrador: "si" })).status).toBe(400);
  });

  test("el dueño edita el borrador y sus perfiles", async () => {
    const { t, borrador } = await escenario();
    await t.api
      .put(`/proyectos/${borrador.id}`)
      .set(t.como("lider"))
      .send({ titulo: "Nuevo titulo" })
      .expect(200);
    await t.api
      .post(`/proyectos/${borrador.id}/perfiles`)
      .set(t.como("lider"))
      .send(datosDePerfil())
      .expect(201);
    await t.api
      .put(`/proyectos/${borrador.id}/perfiles/${borrador.perfiles[0].id}`)
      .set(t.como("lider"))
      .send({ descripcion: "Otra" })
      .expect(200);
    const { body } = await t.api
      .get(`/proyectos/${borrador.id}`)
      .set(t.como("lider"))
      .expect(200);
    expect(body.titulo).toBe("Nuevo titulo");
    expect(body.perfiles).toHaveLength(2);
  });
});

describe("HTTP · borradores · visibilidad publica", () => {
  test("GET /proyectos no los muestra ni los cuenta, con y sin filtro de estado", async () => {
    const { t, publicado } = await escenario();
    const sinFiltro = (await t.api.get("/proyectos").expect(200)).body;
    expect(ids(sinFiltro.data)).toEqual([publicado.id]);
    expect(sinFiltro.meta.total).toBe(1);
    const abiertos = (await t.api.get("/proyectos?estado=ABIERTO").expect(200)).body;
    expect(ids(abiertos.data)).toEqual([publicado.id]);
  });

  test("GET /proyectos no acepta filtrar por BORRADOR ni EN_REVISION", async () => {
    const { t } = await escenario();
    await t.api.get("/proyectos?estado=BORRADOR").expect(400);
    await t.api.get("/proyectos?estado=EN_REVISION").expect(400);
  });

  test("GET /proyectos/destacados no los muestra aunque tengan destacado vigente", async () => {
    const { t, ocultos } = await escenario();
    await ProyectoModel.updateMany(
      { _id: { $in: ocultos } },
      {
        $set: {
          destacado: { desde: enDias(-1), hasta: enDias(5), marcadoPor: ocultos[0] },
        },
      },
    );
    expect((await t.api.get("/proyectos/destacados").expect(200)).body).toEqual([]);
  });

  test("las compatibles de una colaboradora no los incluyen", async () => {
    const { t, publicado } = await escenario();
    await t.personaConPerfil("ada");
    const { perfilId } = await t.yo("ada");
    const { body } = await t.api
      .get(`/colaboradores/${perfilId}/proyectos-potenciales`)
      .set(t.como("ada"))
      .expect(200);
    expect(ids(body.data)).toEqual([publicado.id]);
  });

  test("el timeline del colectivo no los muestra", async () => {
    const { t, colectivo, publicado } = await escenario();
    const eventos = (await t.api.get(`/colectivos/${colectivo.id}/timeline`).expect(200))
      .body;
    const proyectos = new Set(
      eventos.filter((e) => e.proyecto).map((e) => e.proyecto.id),
    );
    expect([...proyectos]).toEqual([publicado.id]);
  });

  test("las estadisticas globales no los cuentan", async () => {
    const { t } = await escenario();
    const { body } = await t.api.get("/estadisticas").expect(200);
    expect(body.proyectos).toEqual({ total: 1, abiertos: 1, finalizados: 0 });
    expect(body.habilidadesMasRequeridas).toEqual([
      expect.objectContaining({ cantidad: 1 }),
    ]);
  });

  test("las estadisticas del colectivo no los cuentan", async () => {
    const { t, colectivo, publicado } = await escenario();
    const { body } = await t.api
      .get(`/colectivos/${colectivo.id}/estadisticas`)
      .set(t.como("lider"))
      .expect(200);
    expect(body.proyectos).toEqual({ total: 1, abiertos: 1, finalizados: 0 });
    expect(body.porProyecto.map((p) => String(p.id))).toEqual([publicado.id]);
  });

  test("los conteos del colectivo no los cuentan", async () => {
    const { t, colectivo } = await escenario();
    const listado = (await t.api.get("/colectivos").expect(200)).body.data;
    expect(listado.find((c) => c.id === colectivo.id).cantidadProyectos).toBe(1);
    const propios = await t.api
      .get(`/colectivos/${colectivo.id}/proyectos`)
      .set(t.como("lider"))
      .expect(200);
    expect(propios.body.meta.perfiles_abiertos).toBe(1);
  });

  test("el listado y el detalle publico del colectivo no los muestran", async () => {
    const { t, colectivo, publicado } = await escenario();
    const listado = (await t.api.get(`/colectivos/${colectivo.id}/proyectos`).expect(200))
      .body;
    expect(ids(listado.data)).toEqual([publicado.id]);
    expect(listado.meta.total).toBe(1);
    const detalle = (await t.api.get(`/colectivos/${colectivo.id}`).expect(200)).body;
    expect(ids(detalle.proyectos)).toEqual([publicado.id]);
    expect(detalle.proyectosMeta.total).toBe(1);
  });

  test("el dueño si ve sus borradores y en revision en su listado y su detalle", async () => {
    const { t, colectivo, publicado, borrador, enRevision } = await escenario();
    const listado = (
      await t.api
        .get(`/colectivos/${colectivo.id}/proyectos`)
        .set(t.como("lider"))
        .expect(200)
    ).body;
    expect(ids(listado.data)).toEqual([publicado.id, borrador.id, enRevision.id]);
    expect(listado.data.map((p) => p.estado)).toEqual([
      "ABIERTO",
      "BORRADOR",
      "EN_REVISION",
    ]);
    const detalle = (
      await t.api.get(`/colectivos/${colectivo.id}`).set(t.como("lider")).expect(200)
    ).body;
    expect(ids(detalle.proyectos)).toEqual([publicado.id, borrador.id, enRevision.id]);
  });

  test("el detalle de un borrador da 404 sin sesion, a otro colectivo y a una colaboradora", async () => {
    const { t, ocultos } = await escenario();
    await t.lideraUnColectivo("otro");
    await t.personaConPerfil("ada");
    for (const id of ocultos) {
      await t.api.get(`/proyectos/${id}`).expect(404);
      await t.api.get(`/proyectos/${id}`).set(t.como("otro")).expect(404);
      await t.api.get(`/proyectos/${id}`).set(t.como("ada")).expect(404);
    }
  });

  test("el dueño y administracion ven el detalle, con estado y publicacion, sin sumar visualizaciones", async () => {
    const { t, borrador, enRevision } = await escenario();
    await t.administradora("root");
    for (const cuenta of ["lider", "root"]) {
      const { body } = await t.api
        .get(`/proyectos/${enRevision.id}`)
        .set(t.como(cuenta))
        .expect(200);
      expect(body.estado).toBe("EN_REVISION");
      expect(body.publicacion).toMatchObject({
        solicitadaEn: expect.any(String),
        rechazo: null,
      });
    }
    await t.api.get(`/proyectos/${borrador.id}`).set(t.como("root")).expect(200);
    const guardado = await ProyectoModel.findById(borrador.id).lean();
    expect(guardado.visualizaciones).toBe(0);
  });

  test("los sub-recursos de un borrador dan 404 al publico y 200 al dueño", async () => {
    const { t, borrador } = await escenario();
    const perfilId = borrador.perfiles[0].id;
    const rutas = [
      `/proyectos/${borrador.id}/perfiles`,
      `/proyectos/${borrador.id}/perfiles/${perfilId}`,
      `/proyectos/${borrador.id}/participaciones`,
      `/proyectos/${borrador.id}/logros`,
      `/proyectos/${borrador.id}/avances`,
    ];
    for (const ruta of rutas) {
      await t.api.get(ruta).expect(404);
      await t.api.get(ruta).set(t.como("lider")).expect(200);
    }
  });

  test("la vista publica de un proyecto aprobado no muestra publicacion", async () => {
    const { t, enRevision, revisionDe, resolver } = await escenario();
    await t.administradora("root");
    await resolver((await revisionDe(enRevision.id))._id, { estado: "REVISADA" }).expect(
      200,
    );
    const { body } = await t.api.get(`/proyectos/${enRevision.id}`).expect(200);
    expect(body.estado).toBe("ABIERTO");
    expect(body.publicacion).toBeUndefined();
  });
});

describe("HTTP · borradores · pedido de publicacion", () => {
  test("pasa a EN_REVISION y crea una revision PENDIENTE de motivo PUBLICACION", async () => {
    const { t, borrador, enRevision, pedirPublicacion, revisionDe } = await escenario();
    const { body } = await pedirPublicacion(borrador.id).expect(200);
    expect(body.estado).toBe("EN_REVISION");
    expect(body.publicacion).toMatchObject({ solicitadaEn: expect.any(String) });
    const revision = await revisionDe(borrador.id);
    expect(revision.estado).toBe("PENDIENTE");
    expect(String(body.publicacion.revisionId)).toBe(String(revision._id));

    await t.administradora("root");
    const cola = (
      await t.api
        .get("/administracion/revisiones?motivo=PUBLICACION&estado=PENDIENTE")
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(cola.map((r) => r.proyecto.id).sort()).toEqual(
      [borrador.id, enRevision.id].sort(),
    );
    expect(cola[0]).toMatchObject({ motivo: "PUBLICACION", estado: "PENDIENTE" });
  });

  test("pedirla dos veces, o sobre un proyecto publicado, da 409", async () => {
    const { enRevision, publicado, pedirPublicacion } = await escenario();
    const repetida = await pedirPublicacion(enRevision.id);
    expect(repetida.status).toBe(409);
    expect((await pedirPublicacion(publicado.id)).status).toBe(409);
    expect(await RevisionModel.countDocuments({ proyectoId: enRevision.id })).toBe(1);
  });

  test("otro colectivo recibe 403 y sin sesion 401", async () => {
    const { t, borrador, pedirPublicacion } = await escenario();
    await t.lideraUnColectivo("otro");
    expect((await pedirPublicacion(borrador.id, "otro")).status).toBe(403);
    await t.api.post(`/proyectos/${borrador.id}/publicacion`).expect(401);
  });

  test("con la fecha de cierre vencida da 422", async () => {
    const { borrador, pedirPublicacion } = await escenario();
    await ProyectoModel.updateOne(
      { _id: borrador.id },
      { $set: { fechaCierre: enDias(-1) } },
    );
    expect((await pedirPublicacion(borrador.id)).status).toBe(422);
  });

  test("en revision no se puede editar el proyecto ni sus perfiles", async () => {
    const { t, enRevision } = await escenario();
    expect(
      (
        await t.api
          .put(`/proyectos/${enRevision.id}`)
          .set(t.como("lider"))
          .send({ titulo: "x" })
      ).status,
    ).toBe(409);
    expect(
      (
        await t.api
          .post(`/proyectos/${enRevision.id}/perfiles`)
          .set(t.como("lider"))
          .send(datosDePerfil())
      ).status,
    ).toBe(409);
    expect(
      (
        await t.api
          .put(`/proyectos/${enRevision.id}/perfiles/${enRevision.perfiles[0].id}`)
          .set(t.como("lider"))
          .send({ descripcion: "x" })
      ).status,
    ).toBe(409);
  });
});

describe("HTTP · borradores · resolucion de administracion", () => {
  test("aprobar publica el proyecto, avisa a las compatibles y lo audita", async () => {
    const { t, enRevision, revisionDe, resolver } = await escenario();
    await t.administradora("root");
    const revision = await revisionDe(enRevision.id);

    const { body } = await resolver(revision._id, { estado: "REVISADA" }).expect(200);
    expect(body).toMatchObject({ motivo: "PUBLICACION", estado: "REVISADA" });

    const proyecto = await ProyectoModel.findById(enRevision.id).lean();
    expect(proyecto.estado).toBe("ABIERTO");
    expect(proyecto.publicacion.aprobadaEn).toEqual(expect.any(Date));
    expect(ids((await t.api.get("/proyectos").expect(200)).body.data)).toContain(
      enRevision.id,
    );
    expect(await AvisoPendienteModel.countDocuments({ entidadId: enRevision.id })).toBe(
      1,
    );
    const auditoria = (
      await t.api
        .get("/administracion/auditoria?accion=PROYECTO_PUBLICADO")
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(auditoria).toEqual([
      expect.objectContaining({
        entidad: { tipo: "PROYECTO", id: enRevision.id },
        detalle: { revisionId: String(revision._id) },
      }),
    ]);
    expect(
      await AccionAdministrativaModel.countDocuments({ accion: "REVISION_RESUELTA" }),
    ).toBe(0);
  });

  test("rechazar vuelve a BORRADOR con la nota para el colectivo, y se puede volver a pedir", async () => {
    const { t, enRevision, revisionDe, resolver, pedirPublicacion } = await escenario();
    await t.administradora("root");
    const revision = await revisionDe(enRevision.id);

    await resolver(revision._id, {
      estado: "DESCARTADA",
      nota: "Contá mejor el alcance",
    }).expect(200);

    const { body } = await t.api
      .get(`/proyectos/${enRevision.id}`)
      .set(t.como("lider"))
      .expect(200);
    expect(body.estado).toBe("BORRADOR");
    expect(body.publicacion.rechazo).toEqual({
      nota: "Contá mejor el alcance",
      fecha: expect.any(String),
    });
    expect(JSON.stringify(body.publicacion)).not.toMatch(/resueltaPor/);
    expect(await AvisoPendienteModel.countDocuments({ entidadId: enRevision.id })).toBe(
      0,
    );
    const auditoria = (
      await t.api
        .get("/administracion/auditoria?accion=PUBLICACION_RECHAZADA")
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(auditoria).toHaveLength(1);

    await t.api
      .put(`/proyectos/${enRevision.id}`)
      .set(t.como("lider"))
      .send({ descripcion: "Mas detalle" })
      .expect(200);
    const otraVez = (await pedirPublicacion(enRevision.id).expect(200)).body;
    expect(otraVez.estado).toBe("EN_REVISION");
    expect(otraVez.publicacion.rechazo).toBeNull();
  });

  test("si el proyecto ya no esta EN_REVISION, resolver da 409 y no cambia nada", async () => {
    const { t, enRevision, revisionDe, resolver } = await escenario();
    await t.administradora("root");
    const revision = await revisionDe(enRevision.id);
    await ProyectoModel.updateOne(
      { _id: enRevision.id },
      { $set: { estado: "BORRADOR" } },
    );

    const respuesta = await resolver(revision._id, { estado: "REVISADA" });
    expect(respuesta.status).toBe(409);
    expect((await revisionDe(enRevision.id)).estado).toBe("PENDIENTE");
    expect((await ProyectoModel.findById(enRevision.id).lean()).estado).toBe("BORRADOR");
    expect(
      await AccionAdministrativaModel.countDocuments({
        accion: { $ne: "ADMIN_OTORGADO" },
      }),
    ).toBe(0);
  });

  test("resolverla dos veces da 409", async () => {
    const { t, enRevision, revisionDe, resolver } = await escenario();
    await t.administradora("root");
    const revision = await revisionDe(enRevision.id);
    await resolver(revision._id, { estado: "REVISADA" }).expect(200);
    expect((await resolver(revision._id, { estado: "DESCARTADA" })).status).toBe(409);
  });

  test("aprobar con la fecha de cierre vencida da 422 y la revision sigue pendiente", async () => {
    const { t, enRevision, revisionDe, resolver } = await escenario();
    await t.administradora("root");
    const revision = await revisionDe(enRevision.id);
    await ProyectoModel.updateOne(
      { _id: enRevision.id },
      { $set: { fechaCierre: enDias(-1) } },
    );
    expect((await resolver(revision._id, { estado: "REVISADA" })).status).toBe(422);
    expect((await revisionDe(enRevision.id)).estado).toBe("PENDIENTE");
    await resolver(revision._id, {
      estado: "DESCARTADA",
      nota: "Cambiá la fecha",
    }).expect(200);
  });

  test("un administrador lider del colectivo recibe 422 CONFLICTO_DE_INTERESES", async () => {
    const { t, enRevision, revisionDe, resolver } = await escenario();
    await t.administradora("lider");
    const revision = await revisionDe(enRevision.id);
    const respuesta = await resolver(revision._id, { estado: "REVISADA" }, "lider");
    expect([respuesta.status, codigo(respuesta)]).toEqual([
      422,
      "CONFLICTO_DE_INTERESES",
    ]);
  });

  test("si falla la auditoria al aprobar, no cambia nada", async () => {
    const { t, enRevision, revisionDe, resolver } = await escenario();
    await t.administradora("root");
    const revision = await revisionDe(enRevision.id);
    const original = t.services.auditoriaService.registrar;
    t.services.auditoriaService.registrar = async () => {
      throw new Error("falla de auditoria");
    };
    try {
      expect((await resolver(revision._id, { estado: "REVISADA" })).status).toBe(500);
    } finally {
      t.services.auditoriaService.registrar = original;
    }
    expect((await revisionDe(enRevision.id)).estado).toBe("PENDIENTE");
    expect((await ProyectoModel.findById(enRevision.id).lean()).estado).toBe(
      "EN_REVISION",
    );
    expect(await AvisoPendienteModel.countDocuments({ entidadId: enRevision.id })).toBe(
      0,
    );
  });
});

describe("HTTP · borradores · operaciones que ya exigen ABIERTO", () => {
  test("postularse a un borrador o a uno en revision da 409", async () => {
    const { t, ocultos } = await escenario();
    await t.personaConPerfil("ada");
    const { perfilId: colaboradorId } = await t.yo("ada");
    for (const id of ocultos) {
      const proyecto = await ProyectoModel.findById(id).lean();
      const respuesta = await t.api
        .post(`/proyectos/${id}/colaboraciones`)
        .set(t.como("ada"))
        .send({ colaboradorId, perfilId: String(proyecto.perfiles[0]._id) });
      expect(respuesta.status).toBe(409);
    }
  });

  test("destacar un borrador o uno en revision da 422", async () => {
    const { t, ocultos } = await escenario();
    await t.administradora("root");
    for (const id of ocultos) {
      const respuesta = await t.api
        .put(`/administracion/proyectos/${id}/destacado`)
        .set(t.como("root"))
        .send({ hasta: enDias(5).toISOString() });
      expect(respuesta.status).toBe(422);
    }
  });

  test("el cierre automatico no los toca aunque tengan la fecha vencida", async () => {
    const { t, ocultos } = await escenario();
    await ProyectoModel.updateMany(
      { _id: { $in: ocultos } },
      { $set: { fechaCierre: enDias(-1) } },
    );
    await t.services.proyectoService.cerrarVencidos();
    const estados = (await ProyectoModel.find({ _id: { $in: ocultos } }).lean()).map(
      (p) => p.estado,
    );
    expect(estados.sort()).toEqual(["BORRADOR", "EN_REVISION"]);
  });

  test("el seguimiento no los marca", async () => {
    const { t, ocultos } = await escenario();
    const candidatos =
      await t.services.revisionService.proyectoRepository.buscarAbiertosParaSeguimiento();
    expect(candidatos.map((p) => String(p._id))).not.toEqual(
      expect.arrayContaining([ocultos[0]]),
    );
    expect(candidatos.map((p) => String(p._id))).not.toEqual(
      expect.arrayContaining([ocultos[1]]),
    );
    const marcados = await t.services.revisionService.marcarSinActualizaciones({
      ahora: enDias(90),
    });
    expect(marcados).toEqual([]);
  });
});
