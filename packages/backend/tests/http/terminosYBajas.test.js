import { armarAdministracion } from "./soporteAdministracion.js";
import { datosDePerfil } from "../fixtures.js";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { RevisionModel } from "../../src/models/RevisionModel.js";
import { ColaboracionModel } from "../../src/models/ColaboracionModel.js";
import { ColectivoModel } from "../../src/models/ColectivoModel.js";
import { AccionAdministrativaModel } from "../../src/models/AccionAdministrativaModel.js";

const ids = (lista) => lista.map((p) => p.id);
const errorDe = (respuesta) => [respuesta.status, respuesta.body.codigo];

async function escenario() {
  const t = await armarAdministracion();
  await t.administradora("root");
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
  const publicarTerminos = (texto = "Reglas de uso", cuenta = "root") =>
    t.api.put("/administracion/terminos").set(t.como(cuenta)).send({ texto });
  const bajaDeProyecto = (id, motivo = "Infringe los terminos", cuenta = "root") =>
    t.api
      .post(`/administracion/proyectos/${id}/baja`)
      .set(t.como(cuenta))
      .send({ motivo });
  const bajaDeColectivo = (id, motivo = "Organizacion en infraccion", cuenta = "root") =>
    t.api
      .post(`/administracion/colectivos/${id}/baja`)
      .set(t.como(cuenta))
      .send({ motivo });
  const auditoria = async (filtro = "") =>
    (
      await t.api
        .get(`/administracion/auditoria${filtro}`)
        .set(t.como("root"))
        .expect(200)
    ).body.data;
  return {
    t,
    colectivo,
    crear,
    publicarTerminos,
    bajaDeProyecto,
    bajaDeColectivo,
    auditoria,
  };
}

describe("HTTP · terminos y condiciones · publicacion", () => {
  test("sin terminos publicados GET /terminos da 404", async () => {
    const { t } = await escenario();
    await t.api.get("/terminos").expect(404);
  });

  test("administracion publica versiones que suben de a una, y cada una se audita", async () => {
    const { t, publicarTerminos, auditoria } = await escenario();
    const primera = (await publicarTerminos("Version **uno**").expect(201)).body;
    expect(primera).toEqual({
      version: 1,
      texto: "Version **uno**",
      publicadoEn: expect.any(String),
      publicadoPor: expect.any(String),
    });
    await publicarTerminos("Version dos").expect(201);

    const { body } = await t.api.get("/terminos").expect(200);
    expect(body).toEqual({
      version: 2,
      texto: "Version dos",
      publicadoEn: expect.any(String),
    });

    const registros = await auditoria(
      "?accion=TERMINOS_ACTUALIZADOS&entidadTipo=TERMINOS",
    );
    expect(registros.map((r) => r.detalle)).toEqual([{ version: 2 }, { version: 1 }]);
    expect(registros[0].entidad.tipo).toBe("TERMINOS");
  });

  test("el texto se sanitiza como Markdown: quita HTML y conserva el codigo", async () => {
    const { publicarTerminos } = await escenario();
    const { body } = await publicarTerminos(
      "# Terminos<script>alert(1)</script>\n\nUsar `List<T>` con cuidado",
    ).expect(201);
    expect(body.texto).not.toContain("<script>");
    expect(body.texto).toContain("`List<T>`");
  });

  test("sin sesion 401, otro contexto 403 y texto vacio 400", async () => {
    const { t, publicarTerminos } = await escenario();
    await t.api.put("/administracion/terminos").send({ texto: "x" }).expect(401);
    expect((await publicarTerminos("x", "lider")).status).toBe(403);
    expect((await publicarTerminos("   ")).status).toBe(400);
  });
});

describe("HTTP · terminos y condiciones · aceptacion al crear un proyecto", () => {
  test("sin terminos publicados se crea como hoy, sin terminos", async () => {
    const { t, crear } = await escenario();
    const creado = (await crear().expect(201)).body;
    const { body } = await t.api
      .get(`/proyectos/${creado.id}`)
      .set(t.como("lider"))
      .expect(200);
    expect(body.terminos).toBeNull();
  });

  test("con terminos vigentes, sin aceptarlos o con otra version da 422, tambien en borradores", async () => {
    const { crear, publicarTerminos } = await escenario();
    await publicarTerminos().expect(201);
    for (const cuerpo of [{}, { terminosAceptados: 2 }, { borrador: true }]) {
      const respuesta = await crear(cuerpo);
      expect(errorDe(respuesta)).toEqual([422, "TERMINOS_NO_ACEPTADOS"]);
      expect(respuesta.body.detalle).toEqual({ versionVigente: 1 });
    }
    expect(await ProyectoModel.countDocuments()).toBe(0);
  });

  test("terminosAceptados tiene que ser un entero positivo", async () => {
    const { crear } = await escenario();
    expect((await crear({ terminosAceptados: "1" })).status).toBe(400);
    expect((await crear({ terminosAceptados: 0 })).status).toBe(400);
  });

  test("aceptando la vigente se guarda la version; el dueño y administracion la ven, el publico no", async () => {
    const { t, crear, publicarTerminos } = await escenario();
    await publicarTerminos().expect(201);
    const creado = (await crear({ terminosAceptados: 1 }).expect(201)).body;
    await crear({ terminosAceptados: 1, borrador: true }).expect(201);

    for (const cuenta of ["lider", "root"]) {
      const { body } = await t.api
        .get(`/proyectos/${creado.id}`)
        .set(t.como(cuenta))
        .expect(200);
      expect(body.terminos).toEqual({ version: 1, aceptadosEn: expect.any(String) });
    }
    const publico = (await t.api.get(`/proyectos/${creado.id}`).expect(200)).body;
    expect(publico).not.toHaveProperty("terminos");
    expect(publico).not.toHaveProperty("baja");
  });

  test("administracion distingue a los que aceptaron una version vieja", async () => {
    const { t, crear, publicarTerminos } = await escenario();
    await publicarTerminos().expect(201);
    const viejo = (await crear({ terminosAceptados: 1 }).expect(201)).body;
    await publicarTerminos("Nuevas reglas").expect(201);
    const nuevo = (await crear({ terminosAceptados: 2 }).expect(201)).body;

    const vigente = (await t.api.get("/terminos").expect(200)).body.version;
    const versiones = [];
    for (const { id } of [viejo, nuevo]) {
      const { body } = await t.api
        .get(`/proyectos/${id}`)
        .set(t.como("root"))
        .expect(200);
      versiones.push(body.terminos.version);
    }
    expect(versiones.map((v) => v < vigente)).toEqual([true, false]);
  });
});

describe("HTTP · baja de proyectos por infraccion", () => {
  test("pasa a DADO_DE_BAJA, cierra sus colaboraciones, lo audita y el colectivo ve el motivo", async () => {
    const { t, colectivo, crear, bajaDeProyecto, auditoria } = await escenario();
    const proyecto = (await crear().expect(201)).body;
    const otro = (await crear({ titulo: "Sigue" }).expect(201)).body;
    await t.personaConPerfil("ada");
    const { perfilId: colaboradorId } = await t.yo("ada");
    await t.api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .set(t.como("ada"))
      .send({ colaboradorId, perfilId: proyecto.perfiles[0].id })
      .expect(201);

    const { body } = await bajaDeProyecto(proyecto.id).expect(200);
    expect(body).toEqual({
      id: proyecto.id,
      estado: "DADO_DE_BAJA",
      baja: { motivo: "Infringe los terminos", fecha: expect.any(String) },
    });

    const colaboraciones = await ColaboracionModel.find({
      proyectoId: proyecto.id,
    }).lean();
    expect(colaboraciones.map((c) => c.estado)).toEqual(["FINALIZADA"]);

    const registros = await auditoria("?accion=PROYECTO_DADO_DE_BAJA");
    expect(registros).toEqual([
      expect.objectContaining({
        entidad: { tipo: "PROYECTO", id: proyecto.id },
        detalle: { motivo: "Infringe los terminos" },
      }),
    ]);

    const detalle = (
      await t.api.get(`/proyectos/${proyecto.id}`).set(t.como("lider")).expect(200)
    ).body;
    expect(detalle.estado).toBe("DADO_DE_BAJA");
    expect(detalle.baja.motivo).toBe("Infringe los terminos");

    const propios = (
      await t.api
        .get(`/colectivos/${colectivo.id}/proyectos`)
        .set(t.como("lider"))
        .expect(200)
    ).body.data;
    expect(propios.find((p) => p.id === proyecto.id).estado).toBe("DADO_DE_BAJA");
    expect(ids(propios)).toContain(otro.id);
  });

  test("queda fuera de toda lectura publica, como un borrador", async () => {
    const { t, colectivo, crear, bajaDeProyecto } = await escenario();
    const proyecto = (await crear().expect(201)).body;
    const otro = (await crear({ titulo: "Sigue" }).expect(201)).body;
    await bajaDeProyecto(proyecto.id).expect(200);

    expect(ids((await t.api.get("/proyectos").expect(200)).body.data)).toEqual([otro.id]);
    await t.api.get(`/proyectos/${proyecto.id}`).expect(404);
    await t.api.get(`/proyectos/${proyecto.id}/perfiles`).expect(404);
    const delColectivo = (
      await t.api.get(`/colectivos/${colectivo.id}/proyectos`).expect(200)
    ).body;
    expect(ids(delColectivo.data)).toEqual([otro.id]);
    const { body: estadisticas } = await t.api.get("/estadisticas").expect(200);
    expect(estadisticas.proyectos).toEqual({ total: 1, abiertos: 1, finalizados: 0 });
    await t.api.get(`/proyectos/${proyecto.id}`).set(t.como("root")).expect(200);
  });

  test("el colectivo ya no puede editarlo, publicarlo ni finalizarlo", async () => {
    const { t, crear, bajaDeProyecto } = await escenario();
    const proyecto = (await crear().expect(201)).body;
    await bajaDeProyecto(proyecto.id).expect(200);
    await t.api
      .put(`/proyectos/${proyecto.id}`)
      .set(t.como("lider"))
      .send({ titulo: "Otro" })
      .expect(409);
    await t.api
      .post(`/proyectos/${proyecto.id}/publicacion`)
      .set(t.como("lider"))
      .expect(409);
    await t.api
      .post(`/proyectos/${proyecto.id}/finalizacion`)
      .set(t.como("lider"))
      .expect(409);
  });

  test("dar de baja uno en revision descarta su revision de publicacion pendiente", async () => {
    const { t, crear, bajaDeProyecto } = await escenario();
    const proyecto = (await crear({ borrador: true }).expect(201)).body;
    await t.api
      .post(`/proyectos/${proyecto.id}/publicacion`)
      .set(t.como("lider"))
      .expect(200);
    await bajaDeProyecto(proyecto.id).expect(200);
    const revision = await RevisionModel.findOne({ proyectoId: proyecto.id }).lean();
    expect(revision.estado).toBe("DESCARTADA");
    expect(revision.nota).toBe("Infringe los terminos");
  });

  test("409 si ya estaba dado de baja, 404 si no existe, 400 sin motivo o con id mal formado", async () => {
    const { crear, bajaDeProyecto } = await escenario();
    const proyecto = (await crear().expect(201)).body;
    await bajaDeProyecto(proyecto.id).expect(200);
    expect((await bajaDeProyecto(proyecto.id)).status).toBe(409);
    expect((await bajaDeProyecto("0123456789abcdef01234567")).status).toBe(404);
    expect((await bajaDeProyecto("no-es-un-id")).status).toBe(400);
    expect((await bajaDeProyecto(proyecto.id, "")).status).toBe(400);
    expect(
      await AccionAdministrativaModel.countDocuments({ accion: "PROYECTO_DADO_DE_BAJA" }),
    ).toBe(1);
  });

  test("sin sesion 401, el lider 403, y un administrador del colectivo 422 CONFLICTO_DE_INTERESES", async () => {
    const { t, crear, bajaDeProyecto } = await escenario();
    const proyecto = (await crear().expect(201)).body;
    await t.api
      .post(`/administracion/proyectos/${proyecto.id}/baja`)
      .send({ motivo: "x" })
      .expect(401);
    expect((await bajaDeProyecto(proyecto.id, "x", "lider")).status).toBe(403);
    await t.administradora("lider");
    expect(errorDe(await bajaDeProyecto(proyecto.id, "x", "lider"))).toEqual([
      422,
      "CONFLICTO_DE_INTERESES",
    ]);
  });

  test("si falla la auditoria, el proyecto sigue abierto", async () => {
    const { t, crear, bajaDeProyecto } = await escenario();
    const proyecto = (await crear().expect(201)).body;
    const original = t.services.auditoriaService.registrar;
    t.services.auditoriaService.registrar = async () => {
      throw new Error("falla de auditoria");
    };
    try {
      expect((await bajaDeProyecto(proyecto.id)).status).toBe(500);
    } finally {
      t.services.auditoriaService.registrar = original;
    }
    expect((await ProyectoModel.findById(proyecto.id).lean()).estado).toBe("ABIERTO");
  });
});

describe("HTTP · baja de colectivos por infraccion", () => {
  test("reusa la baja del colectivo y la audita con el motivo", async () => {
    const { t, colectivo, crear, bajaDeColectivo, auditoria } = await escenario();
    const proyecto = (await crear().expect(201)).body;

    const { body } = await bajaDeColectivo(colectivo.id).expect(200);
    expect(body).toEqual({ id: colectivo.id, fechaBaja: expect.any(String) });

    const guardado = await ColectivoModel.findById(colectivo.id).lean();
    expect(guardado.fechaBaja).toBeInstanceOf(Date);
    expect((await ProyectoModel.findById(proyecto.id).lean()).estado).toBe("FINALIZADO");
    const { contextos } = await t.yo("lider");
    expect(contextos.filter((c) => c.tipo === "COLECTIVO")).toEqual([]);

    const registros = await auditoria("?entidadTipo=COLECTIVO");
    expect(registros).toEqual([
      expect.objectContaining({
        accion: "COLECTIVO_DADO_DE_BAJA",
        entidad: { tipo: "COLECTIVO", id: colectivo.id },
        detalle: { motivo: "Organizacion en infraccion" },
      }),
    ]);
  });

  test("409 si ya estaba dado de baja y 404 si no existe", async () => {
    const { colectivo, bajaDeColectivo } = await escenario();
    await bajaDeColectivo(colectivo.id).expect(200);
    expect((await bajaDeColectivo(colectivo.id)).status).toBe(409);
    expect((await bajaDeColectivo("0123456789abcdef01234567")).status).toBe(404);
  });

  test("el lider 403 y un administrador del colectivo 422 CONFLICTO_DE_INTERESES", async () => {
    const { t, colectivo, bajaDeColectivo } = await escenario();
    expect((await bajaDeColectivo(colectivo.id, "x", "lider")).status).toBe(403);
    await t.administradora("lider");
    expect(errorDe(await bajaDeColectivo(colectivo.id, "x", "lider"))).toEqual([
      422,
      "CONFLICTO_DE_INTERESES",
    ]);
    expect((await ColectivoModel.findById(colectivo.id).lean()).fechaBaja).toBeNull();
  });
});
