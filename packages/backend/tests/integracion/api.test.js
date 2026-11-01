import request from "supertest";
import { crearApp } from "../../src/app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { armarServicesConMongo, usarBaseDeTest } from "./baseDeTest.js";

/**
 * Test de integracion de la capa de controladores: la app Express entera
 * (rutas, Zod, middlewares, controllers, services) contra Mongo. Es el que
 * pide el enunciado de la tercera entrega para el backend.
 */
usarBaseDeTest();

let api;
beforeEach(async () => {
  const { controllers } = await armarServicesConMongo();
  api = request(crearApp(controllers, { limites: { general: 10000, busquedas: 10000 } }));
});

test("alta de un colectivo y de un proyecto, y lectura por HTTP", async () => {
  const colectivo = await api
    .post("/colectivos")
    .send({ nombre: "Fundacion", descripcion: "...", tipoColectivo: "ONG" })
    .expect(201);

  // El id es el ObjectId autogenerado; no se muestran _id ni __v.
  expect(colectivo.body.id).toMatch(/^[a-f\d]{24}$/);
  expect(colectivo.body).not.toHaveProperty("_id");
  expect(colectivo.body).not.toHaveProperty("__v");

  const proyecto = await api
    .post(`/colectivos/${colectivo.body.id}/proyectos`)
    .send({
      titulo: "Sitio",
      descripcion: "...",
      perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
    })
    .expect(201);

  const leido = await api.get(`/proyectos/${proyecto.body.id}`).expect(200);
  expect(leido.body.titulo).toBe("Sitio");
  expect(leido.body.perfiles[0].habilidadesRequeridas).toEqual([
    { codigo: CODIGOS.node, titulo: "Desarrollo Node" },
  ]);
});

test("una postulacion anonima no muestra quien la hizo", async () => {
  const colectivo = await api
    .post("/colectivos")
    .send({ nombre: "Fundacion", descripcion: "...", tipoColectivo: "ONG" });
  const proyecto = await api.post(`/colectivos/${colectivo.body.id}/proyectos`).send({
    titulo: "Sitio",
    descripcion: "...",
    perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
  });
  const ada = await api
    .post("/colaboradores")
    .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] });

  await api
    .post(`/proyectos/${proyecto.body.id}/colaboraciones`)
    .send({ colaboradorId: ada.body.id, esPublica: false })
    .expect(201);

  const colaboraciones = await api.get(`/proyectos/${proyecto.body.id}/colaboraciones`);
  expect(colaboraciones.body).toHaveLength(1);
  expect(colaboraciones.body[0].colaborador).toBeNull();
});

test("un id que no existe o con formato invalido responde 404", async () => {
  await api.get("/colectivos/aaaaaaaaaaaaaaaaaaaaaaaa").expect(404);
  await api.get("/colectivos/no-es-un-id").expect(404);
});
