import { armarAdministracion, enDias } from "./soporteAdministracion.js";
import { datosDePerfil } from "../fixtures.js";

const ids = (lista) => lista.map((p) => p.id);
const errorDe = (respuesta) => [respuesta.status, respuesta.body.codigo];

async function escenario() {
  const t = await armarAdministracion();
  await t.administradora("root");
  const destacar = (id, dias = 10, cuenta = "root") =>
    t.api
      .put(`/administracion/proyectos/${id}/destacado`)
      .set(t.como(cuenta))
      .send({ hasta: enDias(dias).toISOString() });
  const listar = (cuenta = "root") =>
    t.api.get("/administracion/proyectos/destacados").set(t.como(cuenta));
  return { t, destacar, listar };
}

describe("HTTP · GET /administracion/proyectos/destacados", () => {
  test("trae los vigentes en el orden de la portada, con destacado { desde, hasta }", async () => {
    const { t, destacar, listar } = await escenario();
    const primero = await t.proyectoSuelto("Primero");
    const segundo = await t.proyectoSuelto("Segundo");
    await t.proyectoSuelto("Sin destacar");
    const marcado = (await destacar(primero.id, 5).expect(200)).body.destacado;
    await destacar(segundo.id, 20).expect(200);

    const { body } = await listar().expect(200);
    const portada = (await t.api.get("/proyectos/destacados").expect(200)).body;
    expect(ids(body)).toEqual(ids(portada));
    expect(ids(body)).toEqual([segundo.id, primero.id]);

    const fila = body.find((p) => p.id === primero.id);
    expect(fila.destacado).toEqual(marcado);
    expect(fila).toMatchObject({
      titulo: "Primero",
      estado: "ABIERTO",
      colectivo: { id: expect.any(String), nombre: expect.any(String) },
      perfiles: expect.any(Array),
      conflictoDeIntereses: false,
    });
    expect(portada[0].destacado).toBe(true);
  });

  test("no trae los vencidos ni los quitados, y sin destacados devuelve []", async () => {
    const { t, destacar, listar } = await escenario();
    expect((await listar().expect(200)).body).toEqual([]);
    const quitado = await t.proyectoSuelto("Quitado");
    await destacar(quitado.id).expect(200);
    await t.api
      .delete(`/administracion/proyectos/${quitado.id}/destacado`)
      .set(t.como("root"))
      .expect(204);
    expect((await listar().expect(200)).body).toEqual([]);
  });

  test("marca conflictoDeIntereses en los proyectos de colectivos donde participa quien administra", async () => {
    const { t, destacar, listar } = await escenario();
    const colectivo = await t.lideraUnColectivo("lider");
    const propio = (
      await t.api
        .post(`/colectivos/${colectivo.id}/proyectos`)
        .set(t.como("lider"))
        .send({ titulo: "Propio", descripcion: "d", perfiles: [datosDePerfil()] })
        .expect(201)
    ).body;
    const ajeno = await t.proyectoSuelto("Ajeno");
    await destacar(propio.id).expect(200);
    await destacar(ajeno.id).expect(200);
    await t.administradora("lider");

    const porId = Object.fromEntries(
      (await listar("lider").expect(200)).body.map((p) => [p.id, p]),
    );
    expect(porId[propio.id].conflictoDeIntereses).toBe(true);
    expect(porId[ajeno.id].conflictoDeIntereses).toBe(false);
  });

  test("sin sesion 401 y un contexto sin PROYECTO_DESTACAR 403", async () => {
    const { t, listar } = await escenario();
    await t.lideraUnColectivo("lider");
    await t.api.get("/administracion/proyectos/destacados").expect(401);
    expect(errorDe(await listar("lider"))).toEqual([403, "PERMISO_INSUFICIENTE"]);
  });
});
