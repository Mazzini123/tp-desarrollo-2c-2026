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

  test("la ruta de contacto esta suspendida incluso con una colaboracion aceptada", async () => {
    const postulacion = await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId, perfilId })
      .expect(201);

    await api
      .post(`/proyectos/${proyectoId}/colaboraciones/${postulacion.body.id}/aceptacion`)
      .expect(200);

    await api
      .get(`/proyectos/${proyectoId}/colaboradores/${colaboradorId}/contacto`)
      .expect(404);
  });
});
