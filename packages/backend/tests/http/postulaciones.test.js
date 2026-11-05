import { armarApp } from "./app.js";
import { datosDePerfil, CODIGOS } from "../fixtures.js";

describe("HTTP · postulaciones", () => {
  async function armarProyecto(api, perfil) {
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    const proyecto = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ titulo: "P", descripcion: "d", perfiles: [perfil] })
      .expect(201);
    return { proyectoId: proyecto.body.id, perfil: proyecto.body.perfiles[0] };
  }

  async function crearPersona(api, cuentaGit) {
    const persona = await api
      .post("/colaboradores")
      .send({ cuentaGit, codigosHabilidades: [CODIGOS.node] });
    return persona.body.id;
  }

  test("revision manual: postular a un perfil, aceptar y ver el estado", async () => {
    const { api } = await armarApp();
    const { proyectoId, perfil } = await armarProyecto(
      api,
      datosDePerfil({ modoAceptacion: "REVISION_MANUAL", limiteColaboraciones: 3 }),
    );
    expect(perfil).toMatchObject({
      modoAceptacion: "REVISION_MANUAL",
      limiteColaboraciones: 3,
    });

    const ada = await crearPersona(api, "ada");
    const postulacion = await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId: ada, perfilId: perfil.id })
      .expect(201);
    expect(postulacion.body.estado).toBe("PENDIENTE");

    const aceptada = await api
      .post(`/proyectos/${proyectoId}/colaboraciones/${postulacion.body.id}/aceptacion`)
      .expect(200);
    expect(aceptada.body.estado).toBe("ACEPTADA");

    await api
      .post(`/proyectos/${proyectoId}/colaboraciones/${postulacion.body.id}/rechazo`)
      .expect(409);
  });

  test("sin perfilId la postulacion da 400", async () => {
    const { api } = await armarApp();
    const { proyectoId } = await armarProyecto(api, datosDePerfil());
    const ada = await crearPersona(api, "ada");

    await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId: ada })
      .expect(400);
  });

  test("con la busqueda del perfil cerrada no se puede postular", async () => {
    const { api } = await armarApp();
    const { proyectoId, perfil } = await armarProyecto(api, {
      ...datosDePerfil(),
      busquedaAbierta: false,
    });
    const ada = await crearPersona(api, "ada");

    await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId: ada, perfilId: perfil.id })
      .expect(409);
  });

  test("alcanzado el limite del perfil no se puede aceptar otra postulacion", async () => {
    const { api } = await armarApp();
    const { proyectoId, perfil } = await armarProyecto(
      api,
      datosDePerfil({ modoAceptacion: "REVISION_MANUAL", limiteColaboraciones: 1 }),
    );
    const ids = [];
    for (const cuenta of ["ada", "grace"]) {
      const colaboradorId = await crearPersona(api, cuenta);
      const postulacion = await api
        .post(`/proyectos/${proyectoId}/colaboraciones`)
        .send({ colaboradorId, perfilId: perfil.id })
        .expect(201);
      ids.push(postulacion.body.id);
    }

    await api
      .post(`/proyectos/${proyectoId}/colaboraciones/${ids[0]}/aceptacion`)
      .expect(200);
    await api
      .post(`/proyectos/${proyectoId}/colaboraciones/${ids[1]}/aceptacion`)
      .expect(409);
  });

  test("desvincular una colaboracion aceptada es permanente", async () => {
    const { api } = await armarApp();
    const { proyectoId, perfil } = await armarProyecto(api, datosDePerfil());
    const ada = await crearPersona(api, "ada");
    const colaboracion = await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId: ada, perfilId: perfil.id })
      .expect(201);
    const base = `/proyectos/${proyectoId}/colaboraciones/${colaboracion.body.id}`;

    const desvinculada = await api.post(`${base}/desvinculacion`).expect(200);
    expect(desvinculada.body.estado).toBe("DESVINCULADA");

    await api.post(`${base}/desvinculacion`).expect(409);
    await api
      .post(`/proyectos/${proyectoId}/colaboraciones`)
      .send({ colaboradorId: ada, perfilId: perfil.id })
      .expect(409);
  });

  test("un modo desconocido o un limite no entero en el perfil dan 400", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    const crear = (perfil) =>
      api
        .post(`/colectivos/${colectivo.body.id}/proyectos`)
        .send({ titulo: "P", descripcion: "d", perfiles: [perfil] });

    await crear(datosDePerfil({ modoAceptacion: "SORTEO" })).expect(400);
    await crear(
      datosDePerfil({ modoAceptacion: "REVISION_MANUAL", limiteColaboraciones: 1.5 }),
    ).expect(400);
  });
});
