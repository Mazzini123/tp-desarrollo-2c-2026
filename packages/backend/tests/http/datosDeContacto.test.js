import { armarApp } from "./app.js";
import { datosDePerfil, CODIGOS } from "../fixtures.js";

describe("HTTP · datos de contacto", () => {
  let api;
  let proyectoId;
  let perfilId;
  let colaboradorId;

  beforeEach(async () => {
    ({ api } = await armarApp());
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    const proyecto = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({
        titulo: "P",
        descripcion: "d",
        perfiles: [datosDePerfil({ modoAceptacion: "REVISION_MANUAL" })],
      })
      .expect(201);
    proyectoId = proyecto.body.id;
    perfilId = proyecto.body.perfiles[0].id;
    const ada = await api
      .post("/colaboradores")
      .send({
        cuentaGit: "ada",
        codigosHabilidades: [CODIGOS.node],
        mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
      })
      .expect(201);
    colaboradorId = ada.body.id;
  });

  const contacto = (id = colaboradorId) =>
    api.get(`/proyectos/${proyectoId}/colaboradores/${id}/contacto`);

  test("sin postularse no se ven los datos", async () => {
    await contacto().expect(403);
  });

  test("con la postulacion pendiente no se ven, y al aceptarla si", async () => {
    const postulacion = await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId, perfilId })
      .expect(201);

    await contacto().expect(403);

    await api
      .post(`/proyectos/${proyectoId}/colaboraciones/${postulacion.body.id}/aceptacion`)
      .expect(200);

    const respuesta = await contacto().expect(200);
    expect(respuesta.body).toEqual([{ tipo: "EMAIL", valor: "ada@mail.com" }]);
  });

  test("con la postulacion rechazada no se ven", async () => {
    const postulacion = await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId, perfilId })
      .expect(201);
    await api
      .post(`/proyectos/${proyectoId}/colaboraciones/${postulacion.body.id}/rechazo`)
      .expect(200);

    await contacto().expect(403);
  });

  test("una persona que no existe da 404", async () => {
    await contacto("64b000000000000000000000").expect(404);
  });
});
