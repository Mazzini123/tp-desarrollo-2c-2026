import { armarApp } from "./app.js";
import { datosDePerfil, CODIGOS } from "../fixtures.js";

describe("HTTP · postulaciones", () => {
  test("revision manual: postular, aceptar y ver el estado", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    const proyecto = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({
        titulo: "P",
        descripcion: "d",
        perfiles: [datosDePerfil()],
        modoAceptacion: "REVISION_MANUAL",
        limiteVacantes: 3,
      })
      .expect(201);
    expect(proyecto.body).toMatchObject({ modoAceptacion: "REVISION_MANUAL", limiteVacantes: 3 });

    const ada = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] });
    const postulacion = await api
      .post(`/proyectos/${proyecto.body.id}/colaboraciones`)
      .send({ colaboradorId: ada.body.id })
      .expect(201);
    expect(postulacion.body.estado).toBe("PENDIENTE");

    const aceptada = await api
      .post(`/proyectos/${proyecto.body.id}/colaboraciones/${postulacion.body.id}/aceptacion`)
      .expect(200);
    expect(aceptada.body.estado).toBe("ACEPTADA");

    await api
      .post(`/proyectos/${proyecto.body.id}/colaboraciones/${postulacion.body.id}/rechazo`)
      .expect(409);
  });

  test("un modo desconocido o un limite no entero dan 400", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    const base = { titulo: "P", descripcion: "d", perfiles: [datosDePerfil()] };

    await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ ...base, modoAceptacion: "SORTEO" })
      .expect(400);
    await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ ...base, modoAceptacion: "REVISION_MANUAL", limiteVacantes: 1.5 })
      .expect(400);
  });
});
