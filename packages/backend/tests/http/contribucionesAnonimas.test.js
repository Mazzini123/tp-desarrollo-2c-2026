import { armarApp } from "./app.js";
import { datosDePerfil, CODIGOS } from "../fixtures.js";

describe("HTTP · contribuciones anonimas", () => {
  let api;
  let proyectoId;
  let colaboradorId;

  beforeEach(async () => {
    ({ api } = await armarApp());
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "Fundacion", descripcion: "...", tipoColectivo: "FUNDACION" })
      .expect(201);
    const proyecto = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ titulo: "Sitio", descripcion: "...", perfiles: [datosDePerfil()] })
      .expect(201);
    proyectoId = proyecto.body.id;
    const colaborador = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    colaboradorId = colaborador.body.id;
  });

  test("una contribucion anonima figura en el proyecto sin decir quien", async () => {
    const alta = await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId, esPublica: false })
      .expect(201);
    expect(alta.body.colaborador).toBeNull();

    const listado = await api.get(`/proyectos/${proyectoId}/colaboraciones`).expect(200);
    expect(listado.body).toHaveLength(1);
    expect(listado.body[0]).toMatchObject({ esPublica: false, colaborador: null });

    const proyecto = await api.get(`/proyectos/${proyectoId}`).expect(200);
    expect(JSON.stringify(proyecto.body)).not.toContain(colaboradorId);
  });

  test("tampoco aparece en el historial publico de la persona", async () => {
    await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId, esPublica: false })
      .expect(201);

    const historial = await api.get(`/colaboradores/${colaboradorId}/colaboraciones`).expect(200);
    expect(historial.body).toEqual([]);
  });

  test("por defecto la contribucion es publica", async () => {
    const alta = await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId })
      .expect(201);
    expect(alta.body.esPublica).toBe(true);
    expect(alta.body.colaborador.id).toBe(colaboradorId);
  });

  test("anotarse dos veces sigue dando 409 aunque la primera sea anonima", async () => {
    await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId, esPublica: false })
      .expect(201);
    await api.post(`/proyectos/${proyectoId}/colaboraciones`).send({ colaboradorId }).expect(409);
  });
});
