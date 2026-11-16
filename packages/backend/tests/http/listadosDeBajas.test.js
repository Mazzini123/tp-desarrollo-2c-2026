import { armarAdministracion } from "./soporteAdministracion.js";
import { datosDePerfil } from "../fixtures.js";
import { RevisionModel } from "../../src/models/RevisionModel.js";

const ids = (lista) => lista.map((p) => p.id);
const errorDe = (respuesta) => [respuesta.status, respuesta.body.codigo];

async function escenario() {
  const t = await armarAdministracion();
  await t.administradora("root");
  const colectivo = await t.lideraUnColectivo("lider", "Huerta Comunitaria");
  const crear = async (cuerpo = {}, cuenta = "lider", colectivoId = colectivo.id) =>
    (
      await t.api
        .post(`/colectivos/${colectivoId}/proyectos`)
        .set(t.como(cuenta))
        .send({
          titulo: "Proyecto",
          descripcion: "Descripcion",
          perfiles: [datosDePerfil()],
          ...cuerpo,
        })
        .expect(201)
    ).body;
  const pedirPublicacion = (id) =>
    t.api.post(`/proyectos/${id}/publicacion`).set(t.como("lider")).expect(200);
  const bajaDeProyecto = (id, motivo = "Infringe los terminos") =>
    t.api
      .post(`/administracion/proyectos/${id}/baja`)
      .set(t.como("root"))
      .send({ motivo })
      .expect(200);
  const listar = (query = "", cuenta = "root") =>
    t.api.get(`/administracion/proyectos${query}`).set(t.como(cuenta));
  return { t, colectivo, crear, pedirPublicacion, bajaDeProyecto, listar };
}

describe("HTTP · GET /administracion/proyectos (listado para dar de baja)", () => {
  test("trae borradores, en revision, abiertos y finalizados, pero no los dados de baja", async () => {
    const { t, crear, pedirPublicacion, bajaDeProyecto, listar } = await escenario();
    const borrador = await crear({ titulo: "Borrador", borrador: true });
    const enRevision = await crear({ titulo: "En revision", borrador: true });
    await pedirPublicacion(enRevision.id);
    const abierto = await crear({ titulo: "Abierto" });
    const finalizado = await crear({ titulo: "Finalizado" });
    await t.api
      .post(`/proyectos/${finalizado.id}/finalizacion`)
      .set(t.como("lider"))
      .expect(200);
    const dadoDeBaja = await crear({ titulo: "Dado de baja" });
    await bajaDeProyecto(dadoDeBaja.id);

    const { body } = await listar().expect(200);
    expect(ids(body.data)).toEqual([
      borrador.id,
      enRevision.id,
      abierto.id,
      finalizado.id,
    ]);
    expect(body.data.map((p) => p.estado)).toEqual([
      "BORRADOR",
      "EN_REVISION",
      "ABIERTO",
      "FINALIZADO",
    ]);
    expect(body.meta).toEqual({ page: 1, per_page: 10, total: 4, total_pages: 1 });
  });

  test("cada fila trae titulo, estado, colectivo { id, nombre } y conflictoDeIntereses, sin perfiles", async () => {
    const { colectivo, crear, listar } = await escenario();
    const proyecto = await crear({ titulo: "Sitio", borrador: true });
    const { body } = await listar().expect(200);
    expect(body.data).toEqual([
      {
        id: proyecto.id,
        titulo: "Sitio",
        estado: "BORRADOR",
        fechaCreacion: expect.any(String),
        colectivo: { id: colectivo.id, nombre: "Huerta Comunitaria" },
        conflictoDeIntereses: false,
      },
    ]);
  });

  test("filtra por estado y rechaza DADO_DE_BAJA o un estado desconocido con 400", async () => {
    const { crear, listar } = await escenario();
    const borrador = await crear({ borrador: true });
    await crear();
    expect(ids((await listar("?estado=BORRADOR").expect(200)).body.data)).toEqual([
      borrador.id,
    ]);
    expect((await listar("?estado=DADO_DE_BAJA")).status).toBe(400);
    expect((await listar("?estado=OTRO")).status).toBe(400);
  });

  test("q busca en el titulo o en el nombre del colectivo, sin distinguir mayusculas ni tildes", async () => {
    const { t, crear, listar } = await escenario();
    const otro = await t.lideraUnColectivo("otra", "Biblioteca Popular");
    const huerta = await crear({ titulo: "Riego automático", borrador: true });
    const biblioteca = await crear({ titulo: "Catálogo" }, "otra", otro.id);

    expect(ids((await listar("?q=RIEGO%20AUTOMATICO").expect(200)).body.data)).toEqual([
      huerta.id,
    ]);
    expect(ids((await listar("?q=biblioteca").expect(200)).body.data)).toEqual([
      biblioteca.id,
    ]);
    expect(ids((await listar("?q=catalogo").expect(200)).body.data)).toEqual([
      biblioteca.id,
    ]);
    expect((await listar("?q=nada").expect(200)).body.meta.total).toBe(0);
    expect((await listar(`?q=${"x".repeat(81)}`)).status).toBe(400);
  });

  test("filtra por etiqueta normalizada", async () => {
    const { crear, listar } = await escenario();
    const conEtiqueta = await crear({ etiquetas: ["Educacion"], borrador: true });
    await crear();
    expect(ids((await listar("?etiqueta=EDUCACION").expect(200)).body.data)).toEqual([
      conEtiqueta.id,
    ]);
  });

  test("pagina con page y limit, y limit mayor a 100 da 400", async () => {
    const { crear, listar } = await escenario();
    const creados = [];
    for (let i = 0; i < 3; i++)
      creados.push(await crear({ titulo: `P${i}`, borrador: true }));
    const { body } = await listar("?page=2&limit=2").expect(200);
    expect(ids(body.data)).toEqual([creados[2].id]);
    expect(body.meta).toEqual({ page: 2, per_page: 2, total: 3, total_pages: 2 });
    expect((await listar("?limit=101")).status).toBe(400);
  });

  test("marca conflictoDeIntereses en los proyectos de colectivos donde participa quien administra", async () => {
    const { t, colectivo, crear, listar } = await escenario();
    const propio = await crear({ titulo: "Propio" });
    const otro = await t.lideraUnColectivo("otra", "Otro colectivo");
    const ajeno = await crear({ titulo: "Ajeno" }, "otra", otro.id);
    await t.administradora("lider");

    const { body } = await listar("", "lider").expect(200);
    const porId = Object.fromEntries(body.data.map((p) => [p.id, p]));
    expect(porId[propio.id].conflictoDeIntereses).toBe(true);
    expect(porId[propio.id].colectivo.id).toBe(colectivo.id);
    expect(porId[ajeno.id].conflictoDeIntereses).toBe(false);
  });

  test("sin sesion 401 y un contexto sin BAJA_POR_INFRACCION 403", async () => {
    const { t, listar } = await escenario();
    await t.api.get("/administracion/proyectos").expect(401);
    expect(errorDe(await listar("", "lider"))).toEqual([403, "PERMISO_INSUFICIENTE"]);
  });
});

describe("HTTP · GET /colectivos/:id/proyectos · baja y publicacion para el dueño", () => {
  test("el dueño ve baja { motivo, fecha } en los dados de baja y null en el resto", async () => {
    const { t, colectivo, crear, bajaDeProyecto } = await escenario();
    const dadoDeBaja = await crear({ titulo: "Baja" });
    const sigue = await crear({ titulo: "Sigue" });
    await bajaDeProyecto(dadoDeBaja.id, "Contenido prohibido");

    const { body } = await t.api
      .get(`/colectivos/${colectivo.id}/proyectos`)
      .set(t.como("lider"))
      .expect(200);
    const porId = Object.fromEntries(body.data.map((p) => [p.id, p]));
    expect(porId[dadoDeBaja.id].baja).toEqual({
      motivo: "Contenido prohibido",
      fecha: expect.any(String),
    });
    expect(porId[sigue.id].baja).toBeNull();
  });

  test("el dueño ve publicacion con solicitadaEn y el rechazo, igual que el detalle", async () => {
    const { t, colectivo, crear, pedirPublicacion } = await escenario();
    const directo = await crear({ titulo: "Directo" });
    const borrador = await crear({ titulo: "Borrador", borrador: true });
    const enRevision = await crear({ titulo: "En revision", borrador: true });
    const rechazado = await crear({ titulo: "Rechazado", borrador: true });
    await pedirPublicacion(enRevision.id);
    await pedirPublicacion(rechazado.id);
    const revision = await RevisionModel.findOne({ proyectoId: rechazado.id }).lean();
    await t.api
      .post(`/administracion/revisiones/${revision._id}/resolucion`)
      .set(t.como("root"))
      .send({ estado: "DESCARTADA", nota: "Falta el alcance" })
      .expect(200);

    const { body } = await t.api
      .get(`/colectivos/${colectivo.id}/proyectos`)
      .set(t.como("lider"))
      .expect(200);
    const porId = Object.fromEntries(body.data.map((p) => [p.id, p]));
    expect(porId[directo.id].publicacion).toBeNull();
    expect(porId[borrador.id].publicacion).toBeNull();
    expect(porId[enRevision.id].publicacion).toEqual({
      solicitadaEn: expect.any(String),
      revisionId: expect.any(String),
      rechazo: null,
      aprobadaEn: null,
    });
    expect(porId[rechazado.id].estado).toBe("BORRADOR");
    expect(porId[rechazado.id].publicacion.rechazo).toEqual({
      nota: "Falta el alcance",
      fecha: expect.any(String),
    });

    for (const proyecto of body.data) {
      const detalle = (
        await t.api.get(`/proyectos/${proyecto.id}`).set(t.como("lider")).expect(200)
      ).body;
      expect(proyecto.publicacion).toEqual(detalle.publicacion);
      expect(proyecto.baja).toEqual(detalle.baja);
    }
  });

  test("el publico, otra cuenta y administracion no reciben baja ni publicacion en el listado", async () => {
    const { t, colectivo, crear } = await escenario();
    await crear();
    await t.lideraUnColectivo("otra");
    for (const cabeceras of [{}, t.como("otra"), t.como("root")]) {
      const { body } = await t.api
        .get(`/colectivos/${colectivo.id}/proyectos`)
        .set(cabeceras)
        .expect(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).not.toHaveProperty("baja");
      expect(body.data[0]).not.toHaveProperty("publicacion");
    }
  });
});
