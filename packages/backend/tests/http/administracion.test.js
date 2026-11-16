import { armarAdministracion, enDias } from "./soporteAdministracion.js";
import { datosDePerfil } from "../fixtures.js";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { RevisionModel } from "../../src/models/RevisionModel.js";
import { NotificacionModel } from "../../src/models/NotificacionModel.js";

const hasta = (dias = 10) => enDias(dias).toISOString();
const codigo = (respuesta) => respuesta.body.codigo;

describe("HTTP · destacados (adicional 18)", () => {
  test("un administrador destaca un proyecto: aparece primero, en la portada y en la auditoria", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const otro = await t.proyectoSuelto("Otro");
    const proyecto = await t.proyectoSuelto("Destacado");

    const { body } = await t.api
      .put(`/administracion/proyectos/${proyecto.id}/destacado`)
      .set(t.como("root"))
      .send({ hasta: hasta() })
      .expect(200);
    expect(body).toMatchObject({ id: proyecto.id });
    expect(body.destacado).toEqual({
      desde: expect.any(String),
      hasta: expect.any(String),
    });
    expect(body.destacado.marcadoPor).toBeUndefined();

    const listado = (await t.api.get("/proyectos").expect(200)).body.data;
    expect(listado.map((p) => p.id)).toEqual([proyecto.id, otro.id]);
    expect(listado[0].destacado).toBe(true);
    expect(listado[1].destacado).toBeUndefined();
    expect(listado[0].marcadoPor).toBeUndefined();

    const portada = (await t.api.get("/proyectos/destacados").expect(200)).body;
    expect(portada.map((p) => p.id)).toEqual([proyecto.id]);

    const auditoria = (
      await t.api.get("/administracion/auditoria").set(t.como("root")).expect(200)
    ).body.data;
    expect(auditoria[0]).toMatchObject({
      accion: "PROYECTO_DESTACADO",
      entidad: { tipo: "PROYECTO", id: proyecto.id },
    });
  });

  test("al pasar la fecha el proyecto deja de listarse como destacado, sin intervencion", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const proyecto = await t.proyectoSuelto();
    await t.api
      .put(`/administracion/proyectos/${proyecto.id}/destacado`)
      .set(t.como("root"))
      .send({ hasta: hasta(1) })
      .expect(200);

    await ProyectoModel.updateOne(
      { _id: proyecto.id },
      { $set: { "destacado.desde": enDias(-3), "destacado.hasta": enDias(-1) } },
    );

    expect((await t.api.get("/proyectos/destacados").expect(200)).body).toEqual([]);
    const [primero] = (await t.api.get("/proyectos").expect(200)).body.data;
    expect(primero.destacado).toBeUndefined();
  });

  test("los vigentes van primero en cada pagina del listado, sin repetirse ni perderse", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const proyectos = [];
    for (const titulo of ["a", "b", "c", "d"])
      proyectos.push(await t.proyectoSuelto(titulo));
    await t.api
      .put(`/administracion/proyectos/${proyectos[3].id}/destacado`)
      .set(t.como("root"))
      .send({ hasta: hasta() })
      .expect(200);

    const primera = (await t.api.get("/proyectos?page=1&limit=2").expect(200)).body;
    const segunda = (await t.api.get("/proyectos?page=2&limit=2").expect(200)).body;
    const ids = [...primera.data, ...segunda.data].map((p) => p.id);

    expect(primera.meta.total).toBe(4);
    expect(ids[0]).toBe(proyectos[3].id);
    expect(new Set(ids).size).toBe(4);
  });

  test("un proyecto finalizado, de un colectivo dado de baja o con fecha pasada da 422", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const destacar = (id, cuerpo) =>
      t.api
        .put(`/administracion/proyectos/${id}/destacado`)
        .set(t.como("root"))
        .send(cuerpo);

    const finalizado = await t.proyectoSuelto("f");
    await t.services.proyectoService.finalizar(finalizado.id);
    expect((await destacar(finalizado.id, { hasta: hasta() })).status).toBe(422);

    const deBaja = await t.proyectoSuelto("b");
    await t.services.colectivoService.darDeBaja(deBaja.colectivoId);
    expect((await destacar(deBaja.id, { hasta: hasta() })).status).toBe(422);

    const abierto = await t.proyectoSuelto("o");
    expect((await destacar(abierto.id, { hasta: enDias(-1).toISOString() })).status).toBe(
      422,
    );
    expect((await destacar(abierto.id, {})).status).toBe(400);
  });

  test("el septimo destacado vigente da 409 y quitar uno lo permite", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const proyectos = [];
    for (let i = 0; i < 7; i++) proyectos.push(await t.proyectoSuelto(`p${i}`));
    const destacar = (p) =>
      t.api
        .put(`/administracion/proyectos/${p.id}/destacado`)
        .set(t.como("root"))
        .send({ hasta: hasta() });

    for (const proyecto of proyectos.slice(0, 6)) {
      expect((await destacar(proyecto)).status).toBe(200);
    }
    expect((await destacar(proyectos[6])).status).toBe(409);
    expect((await destacar(proyectos[0])).status).toBe(200);

    await t.api
      .delete(`/administracion/proyectos/${proyectos[0].id}/destacado`)
      .set(t.como("root"))
      .expect(204);
    expect((await destacar(proyectos[6])).status).toBe(200);

    const acciones = (
      await t.api
        .get("/administracion/auditoria?accion=PROYECTO_DESTACADO_QUITADO")
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(acciones).toHaveLength(1);
  });

  test("quitar el destacado de un proyecto que no lo tiene da 404", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const proyecto = await t.proyectoSuelto();
    await t.api
      .delete(`/administracion/proyectos/${proyecto.id}/destacado`)
      .set(t.como("root"))
      .expect(404);
  });
});

describe("HTTP · revisiones (adicional 35)", () => {
  const revisiones = (t, consulta = "") =>
    t.api.get(`/administracion/revisiones${consulta}`).set(t.como("root")).expect(200);

  test("el job marca un proyecto iniciado sin avances en 30 dias y no lo duplica", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const proyecto = await t.proyectoConAceptada("ada");

    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) });
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(32) });

    const { body } = await revisiones(t);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      motivo: "SIN_ACTUALIZACIONES",
      estado: "PENDIENTE",
      proyecto: { id: proyecto.id },
    });
    expect(body.meta.total).toBe(1);
  });

  test("antes del plazo, o con un avance reciente, no se marca", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.proyectoConAceptada("ada");
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(29) });
    expect((await revisiones(t)).body.data).toEqual([]);
  });

  test("un proyecto abierto sin colaboraciones aceptadas no se marca", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.proyectoSuelto();
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(90) });
    expect((await revisiones(t)).body.data).toEqual([]);
  });

  test("un nuevo avance no resuelve la revision: la resuelve un administrador una sola vez", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const proyecto = await t.proyectoConAceptada("ada");
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) });
    await t.services.avanceService.registrar(proyecto.id, { porcentajeConcrecion: 10 });
    const [revision] = (await revisiones(t)).body.data;
    expect(revision.estado).toBe("PENDIENTE");

    const resuelta = await t.api
      .post(`/administracion/revisiones/${revision.id}/resolucion`)
      .set(t.como("root"))
      .send({ estado: "REVISADA", nota: "Hablamos con el colectivo" })
      .expect(200);
    expect(resuelta.body).toMatchObject({
      estado: "REVISADA",
      nota: "Hablamos con el colectivo",
      resueltaEn: expect.any(String),
    });

    const repetida = await t.api
      .post(`/administracion/revisiones/${revision.id}/resolucion`)
      .set(t.como("root"))
      .send({ estado: "DESCARTADA" });
    expect(repetida.status).toBe(409);

    const auditoria = (
      await t.api
        .get("/administracion/auditoria?accion=REVISION_RESUELTA")
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(auditoria).toHaveLength(1);
  });

  test("resolver con un estado que no es final da 400, y una revision inexistente 404", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.proyectoConAceptada("ada");
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) });
    const [revision] = (await revisiones(t)).body.data;

    await t.api
      .post(`/administracion/revisiones/${revision.id}/resolucion`)
      .set(t.como("root"))
      .send({ estado: "PENDIENTE" })
      .expect(400);
    await t.api
      .post("/administracion/revisiones/64b000000000000000000001/resolucion")
      .set(t.como("root"))
      .send({ estado: "REVISADA" })
      .expect(404);
  });

  test("una revision resuelta no se recrea hasta pasar otro periodo completo", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.proyectoConAceptada("ada");
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) });
    const [revision] = (await revisiones(t)).body.data;
    await t.api
      .post(`/administracion/revisiones/${revision.id}/resolucion`)
      .set(t.como("root"))
      .send({ estado: "DESCARTADA" })
      .expect(200);
    await RevisionModel.updateOne(
      { _id: revision.id },
      { $set: { resueltaEn: enDias(31) } },
    );

    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(40) });
    expect((await revisiones(t, "?estado=PENDIENTE")).body.data).toEqual([]);

    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(62) });
    expect((await revisiones(t, "?estado=PENDIENTE")).body.data).toHaveLength(1);
    expect((await revisiones(t)).body.meta.total).toBe(2);
  });

  test("filtra por estado y motivo", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.proyectoConAceptada("ada");
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) });

    expect((await revisiones(t, "?estado=REVISADA")).body.data).toEqual([]);
    expect((await revisiones(t, "?motivo=SIN_ACTUALIZACIONES")).body.data).toHaveLength(
      1,
    );
    await t.api
      .get("/administracion/revisiones?estado=INVENTADO")
      .set(t.como("root"))
      .expect(400);
  });

  test("crear una revision no envia mensajes ni correos", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.proyectoConAceptada("ada");
    await t.services.notificacionService.procesarEnviosPendientes();
    const antes = await NotificacionModel.countDocuments();
    const enviados = t.canales.EMAIL.enviados.length;

    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) });
    await t.services.notificacionService.procesarEnviosPendientes();

    expect(await NotificacionModel.countDocuments()).toBe(antes);
    expect(t.canales.EMAIL.enviados).toHaveLength(enviados);
  });

  test("dos pasadas simultaneas del job dejan una sola revision pendiente", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.proyectoConAceptada("ada");
    await Promise.all([
      t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) }),
      t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) }),
    ]);
    expect((await revisiones(t, "?estado=PENDIENTE")).body.data).toHaveLength(1);
  });
});

describe("HTTP · conflicto de intereses", () => {
  test("un administrador que lidera un colectivo no destaca ni resuelve sobre sus proyectos", async () => {
    const t = await armarAdministracion();
    const { contextoId } = await t.administradora("ana");
    const colectivo = await t.lideraUnColectivo("ana");
    const { body: propio } = await t.api
      .post(`/colectivos/${colectivo.id}/proyectos`)
      .set(t.como("ana"))
      .send({ titulo: "Huerta", descripcion: "d", perfiles: [datosDePerfil()] })
      .expect(201);
    const persona = await t.services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: ["desarrollo_node"],
    });
    await t.services.colaboracionService.registrar({
      proyectoId: propio.id,
      perfilId: propio.perfiles[0].id,
      colaboradorId: persona.id,
    });
    await t.services.revisionService.marcarSinActualizaciones({ ahora: enDias(31) });
    await t.elegir("ana", contextoId);
    const ajeno = await t.proyectoSuelto("Ajeno");

    const rechazado = await t.api
      .put(`/administracion/proyectos/${propio.id}/destacado`)
      .set(t.como("ana"))
      .send({ hasta: hasta() });
    expect(rechazado.status).toBe(422);
    expect(codigo(rechazado)).toBe("CONFLICTO_DE_INTERESES");
    await t.api
      .put(`/administracion/proyectos/${ajeno.id}/destacado`)
      .set(t.como("ana"))
      .send({ hasta: hasta() })
      .expect(200);

    const [revision] = (
      await t.api.get("/administracion/revisiones").set(t.como("ana")).expect(200)
    ).body.data;
    const resuelta = await t.api
      .post(`/administracion/revisiones/${revision.id}/resolucion`)
      .set(t.como("ana"))
      .send({ estado: "REVISADA" });
    expect(resuelta.status).toBe(422);
    expect(codigo(resuelta)).toBe("CONFLICTO_DE_INTERESES");

    expect(
      (await t.api.get("/administracion/revisiones?estado=PENDIENTE").set(t.como("ana")))
        .body.data,
    ).toHaveLength(1);
  });
});

describe("HTTP · auditoria", () => {
  test("lista las acciones paginadas y filtrables, sin datos personales", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const a = await t.proyectoSuelto("a");
    const b = await t.proyectoSuelto("b");
    for (const proyecto of [a, b]) {
      await t.api
        .put(`/administracion/proyectos/${proyecto.id}/destacado`)
        .set(t.como("root"))
        .send({ hasta: hasta() })
        .expect(200);
    }

    const todas = (
      await t.api
        .get("/administracion/auditoria?limit=1&accion=PROYECTO_DESTACADO")
        .set(t.como("root"))
        .expect(200)
    ).body;
    expect(todas.meta).toMatchObject({ per_page: 1, total: 2, total_pages: 2 });

    const deA = (
      await t.api
        .get(`/administracion/auditoria?entidadTipo=PROYECTO&entidadId=${a.id}`)
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(deA).toHaveLength(1);
    expect(deA[0].detalle).toEqual({ hasta: expect.any(String) });

    const futuras = (
      await t.api
        .get(`/administracion/auditoria?desde=${enDias(1).toISOString()}`)
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(futuras).toEqual([]);
    await t.api
      .get("/administracion/auditoria?accion=INVENTADA")
      .set(t.como("root"))
      .expect(400);
  });
});

describe("HTTP · administradores", () => {
  test("un administrador otorga el rol a otra cuenta, una sola vez, y queda auditado", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const bea = await t.usuario("bea");

    const alta = await t.api
      .post("/administracion/administradores")
      .set(t.como("root"))
      .send({ usuarioId: bea })
      .expect(201);
    expect(alta.body).toMatchObject({ usuarioId: bea, creado: true });
    const repetida = await t.api
      .post("/administracion/administradores")
      .set(t.como("root"))
      .send({ usuarioId: bea })
      .expect(200);
    expect(repetida.body).toEqual({ usuarioId: bea, creado: false });

    expect((await t.yo("bea")).contextos.map((c) => c.tipo)).toEqual(["ADMINISTRACION"]);
    const auditoria = (
      await t.api
        .get("/administracion/auditoria?accion=ADMIN_OTORGADO")
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    expect(auditoria.filter((a) => a.entidad.id === bea)).toHaveLength(1);
  });

  test("otorgarlo a un usuario inexistente da 404 y a un id invalido 400", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    await t.api
      .post("/administracion/administradores")
      .set(t.como("root"))
      .send({ usuarioId: "64b000000000000000000001" })
      .expect(404);
    await t.api
      .post("/administracion/administradores")
      .set(t.como("root"))
      .send({ usuarioId: "x" })
      .expect(400);
  });

  test("el comando de administracion tambien audita, sin autor", async () => {
    const t = await armarAdministracion();
    const bea = await t.usuario("bea");
    await t.services.administradorService.otorgar({ usuarioId: bea });
    await t.administradora("root");

    const auditoria = (
      await t.api
        .get("/administracion/auditoria?accion=ADMIN_OTORGADO")
        .set(t.como("root"))
        .expect(200)
    ).body.data;
    const delComando = auditoria.find((a) => a.entidad.id === bea);
    expect(delComando).toMatchObject({
      usuarioId: null,
      contextoId: null,
      detalle: { origen: "COMANDO" },
    });
  });
});

describe("HTTP · permisos de las rutas de administracion", () => {
  const rutas = [
    ["get", "/administracion/auditoria"],
    ["get", "/administracion/revisiones"],
    ["get", "/administracion/proyectos"],
    ["get", "/administracion/proyectos/destacados"],
    [
      "post",
      "/administracion/revisiones/64b000000000000000000001/resolucion",
      { estado: "REVISADA" },
    ],
    [
      "put",
      "/administracion/proyectos/64b000000000000000000001/destacado",
      { hasta: "2999-01-01" },
    ],
    ["delete", "/administracion/proyectos/64b000000000000000000001/destacado"],
    [
      "post",
      "/administracion/administradores",
      { usuarioId: "64b000000000000000000001" },
    ],
    ["put", "/administracion/terminos", { texto: "Reglas" }],
    [
      "post",
      "/administracion/proyectos/64b000000000000000000001/baja",
      { motivo: "Infraccion" },
    ],
    [
      "post",
      "/administracion/colectivos/64b000000000000000000001/baja",
      { motivo: "Infraccion" },
    ],
  ];

  test.each(rutas)(
    "%s %s rechaza todo lo que no sea un contexto de administracion",
    async (metodo, ruta, cuerpo = {}) => {
      const t = await armarAdministracion();
      await t.lideraUnColectivo("lider");
      await t.personaConPerfil("ada");

      await t.api[metodo](ruta).send(cuerpo).expect(401);

      const comoLider = await t.api[metodo](ruta).set(t.como("lider")).send(cuerpo);
      expect([comoLider.status, codigo(comoLider)]).toEqual([
        403,
        "PERMISO_INSUFICIENTE",
      ]);

      const comoColaboradora = await t.api[metodo](ruta).set(t.como("ada")).send(cuerpo);
      expect([comoColaboradora.status, codigo(comoColaboradora)]).toEqual([
        403,
        "PERMISO_INSUFICIENTE",
      ]);

      const sinContexto = await t.api[metodo](ruta).set(t.token("ada")).send(cuerpo);
      expect([sinContexto.status, codigo(sinContexto)]).toEqual([
        400,
        "CONTEXTO_REQUERIDO",
      ]);
    },
  );

  test("una cuenta administradora que cambia a otro contexto recibe 403 en las rutas de administracion", async () => {
    const t = await armarAdministracion();
    await t.administradora("ana");
    await t.lideraUnColectivo("ana");
    const colectivo = await t.contextoDe("ana", "COLECTIVO");
    await t.elegir("ana", colectivo.id);

    const respuesta = await t.api.get("/administracion/auditoria").set(t.como("ana"));
    expect([respuesta.status, codigo(respuesta)]).toEqual([403, "PERMISO_INSUFICIENTE"]);
  });

  test("los listados publicos no exponen quien destaco ni notas de revisiones", async () => {
    const t = await armarAdministracion();
    await t.administradora("root");
    const proyecto = await t.proyectoSuelto();
    await t.api
      .put(`/administracion/proyectos/${proyecto.id}/destacado`)
      .set(t.como("root"))
      .send({ hasta: hasta() })
      .expect(200);

    const publico = JSON.stringify([
      (await t.api.get("/proyectos").expect(200)).body,
      (await t.api.get("/proyectos/destacados").expect(200)).body,
      (await t.api.get(`/proyectos/${proyecto.id}`).expect(200)).body,
    ]);
    expect(publico).not.toMatch(/marcadoPor|"nota"|"resueltaPor"|"motivo"/);
  });
});
