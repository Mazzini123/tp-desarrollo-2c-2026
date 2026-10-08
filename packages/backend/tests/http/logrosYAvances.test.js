import { armarApp } from "./app.js";
import { datosDePerfil } from "../fixtures.js";

async function crearProyecto(api) {
  const colectivo = await api
    .post("/colectivos")
    .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
  const proyecto = await api
    .post(`/colectivos/${colectivo.body.id}/proyectos`)
    .send({ titulo: "P", descripcion: "d", perfiles: [datosDePerfil()] });
  return proyecto.body;
}

describe("HTTP · logros", () => {
  test("CRUD completo", async () => {
    const { api } = await armarApp();
    const proyecto = await crearProyecto(api);
    const base = `/proyectos/${proyecto.id}/logros`;

    const creado = await api
      .post(base)
      .send({ titulo: "Primer deploy", descripcion: "Publicado" })
      .expect(201);
    await api.get(base).expect(200, [creado.body]);
    await api.get(`${base}/${creado.body.id}`).expect(200);

    const actualizado = await api
      .put(`${base}/${creado.body.id}`)
      .send({ titulo: "Primer deploy", descripcion: "Con Docker" })
      .expect(200);
    expect(actualizado.body.descripcion).toBe("Con Docker");

    await api.delete(`${base}/${creado.body.id}`).expect(204);
    await api.get(`${base}/${creado.body.id}`).expect(404);
  });

  test("valida el body: campos obligatorios y sin campos de mas", async () => {
    const { api } = await armarApp();
    const proyecto = await crearProyecto(api);
    const base = `/proyectos/${proyecto.id}/logros`;

    await api.post(base).send({ titulo: "Sin descripcion" }).expect(400);
    await api
      .post(base)
      .send({ titulo: "x", descripcion: "y", fecha: "2020-01-01" })
      .expect(400);
  });

  test("titulo repetido responde 409", async () => {
    const { api } = await armarApp();
    const proyecto = await crearProyecto(api);
    const base = `/proyectos/${proyecto.id}/logros`;

    await api.post(base).send({ titulo: "Hito", descripcion: "a" }).expect(201);
    await api.post(base).send({ titulo: "Hito", descripcion: "b" }).expect(409);
  });
});

describe("HTTP · avances", () => {
  const enlaces = {
    urlSistema: "https://sistema.example.org",
    urlRepositorio: "https://github.com/ejemplo/repo",
  };

  test("registrar, listar y buscar por id; el proyecto muestra el ultimo valor", async () => {
    const { api } = await armarApp();
    const proyecto = await crearProyecto(api);
    const base = `/proyectos/${proyecto.id}/avances`;

    await api
      .post(base)
      .send({ porcentajeConcrecion: 30, ...enlaces })
      .expect(201);
    const segundo = await api
      .post(base)
      .send({ porcentajeConcrecion: 70, ...enlaces })
      .expect(201);

    const lista = await api.get(base).expect(200);
    expect(lista.body.map((a) => a.porcentajeConcrecion)).toEqual([30, 70]);
    await api.get(`${base}/${segundo.body.id}`).expect(200);

    const detalle = await api.get(`/proyectos/${proyecto.id}`).expect(200);
    expect(detalle.body.porcentajeConcrecion).toBe(70);
  });

  test("no hay rutas para editar ni borrar avances", async () => {
    const { api } = await armarApp();
    const proyecto = await crearProyecto(api);
    const avance = await api
      .post(`/proyectos/${proyecto.id}/avances`)
      .send({ porcentajeConcrecion: 30, ...enlaces });

    await api.delete(`/proyectos/${proyecto.id}/avances/${avance.body.id}`).expect(404);
    await api
      .put(`/proyectos/${proyecto.id}/avances/${avance.body.id}`)
      .send({ porcentajeConcrecion: 10, ...enlaces })
      .expect(404);
  });

  test("valida el porcentaje y que los enlaces sean http o https", async () => {
    const { api } = await armarApp();
    const proyecto = await crearProyecto(api);
    const base = `/proyectos/${proyecto.id}/avances`;

    await api
      .post(base)
      .send({ porcentajeConcrecion: 150, ...enlaces })
      .expect(400);
    await api
      .post(base)
      .send({ porcentajeConcrecion: 30, ...enlaces, urlSistema: "javascript:alert(1)" })
      .expect(400);
    await api
      .post(base)
      .send({ porcentajeConcrecion: 30, ...enlaces, urlRepositorio: "no es una url" })
      .expect(400);
  });
});
