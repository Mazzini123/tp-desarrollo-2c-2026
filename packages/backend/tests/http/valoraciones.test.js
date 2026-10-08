import { armarApp } from "./app.js";
import { datosDePerfil, CODIGOS } from "../fixtures.js";

describe("HTTP · valoraciones", () => {
  test("finalizar, valorar y consultar los dos historiales", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    const proyecto = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ titulo: "P", descripcion: "d", perfiles: [datosDePerfil()] });
    const ada = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] });
    const colaboracion = await api
      .post(`/proyectos/${proyecto.body.id}/colaboraciones`)
      .send({ colaboradorId: ada.body.id });
    const base = `/proyectos/${proyecto.body.id}/colaboraciones/${colaboracion.body.id}`;

    await api.post(`${base}/finalizacion`).expect(200);
    await api
      .post(`${base}/valoraciones`)
      .send({ autor: "COLECTIVO", puntaje: 5, comentario: "Excelente" })
      .expect(201);
    await api.post(`${base}/valoraciones`).send({ autor: "OTRO", puntaje: 5 }).expect(400);

    const deAda = await api.get(`/colaboradores/${ada.body.id}/valoraciones`).expect(200);
    expect(deAda.body).toMatchObject({ cantidad: 1, promedio: 5 });

    const delColectivo = await api.get(`/colectivos/${colectivo.body.id}/valoraciones`).expect(200);
    expect(delColectivo.body).toMatchObject({ cantidad: 0, promedio: null });
  });
});
