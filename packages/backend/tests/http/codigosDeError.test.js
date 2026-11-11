import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";

async function prepararProyecto() {
  const { api } = await armarApp();
  const colectivo = await api
    .post("/colectivos")
    .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" })
    .expect(201);
  const proyecto = await api
    .post(`/colectivos/${colectivo.body.id}/proyectos`)
    .send({ titulo: "P", descripcion: "d", perfiles: [datosDePerfil()] })
    .expect(201);
  return { api, proyecto: proyecto.body };
}

describe("HTTP · 400 para la forma, 422 para las reglas de negocio", () => {
  test("una regla de negocio incumplida con un pedido bien formado responde 422", async () => {
    const { api, proyecto } = await prepararProyecto();
    const perfil = proyecto.perfiles[0];

    await api.delete(`/proyectos/${proyecto.id}/perfiles/${perfil.id}`).expect(422);
    const sinHabilidades = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.react] })
      .expect(201);
    const respuesta = await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .send({ colaboradorId: sinHabilidades.body.id, perfilId: perfil.id })
      .expect(422);
    expect(respuesta.body.message).toMatch(/habilidades requeridas/);
  });

  test("un pedido mal formado sigue respondiendo 400", async () => {
    const { api, proyecto } = await prepararProyecto();
    await api
      .post(`/proyectos/${proyecto.id}/avances`)
      .send({ porcentajeConcrecion: "mucho" })
      .expect(400);
  });
});

describe("HTTP · ids mal formados responden 400", () => {
  test("en cualquier parametro de la ruta, antes de buscar en la base", async () => {
    const { api, proyecto } = await prepararProyecto();

    const respuesta = await api.get("/proyectos/123").expect(400);
    expect(respuesta.body.message).toBe('El parametro "id" no es un id valido');
    await api.get(`/proyectos/${proyecto.id}/perfiles/x`).expect(400);
    await api.get(`/proyectos/${proyecto.id}/logros/x`).expect(400);
    await api.get(`/proyectos/${proyecto.id}/avances/x`).expect(400);
    await api.get("/colaboradores/x/valoraciones").expect(400);
  });

  test("un id bien formado que no existe sigue respondiendo 404", async () => {
    const { api, proyecto } = await prepararProyecto();
    await api.get("/proyectos/aaaaaaaaaaaaaaaaaaaaaaaa").expect(404);
    await api
      .get(`/proyectos/${proyecto.id}/perfiles/aaaaaaaaaaaaaaaaaaaaaaaa`)
      .expect(404);
  });

  test("los ids que viajan en el body tambien se validan", async () => {
    const { api, proyecto } = await prepararProyecto();
    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .send({ colaboradorId: "ada", perfilId: proyecto.perfiles[0].id })
      .expect(400);
  });
});
