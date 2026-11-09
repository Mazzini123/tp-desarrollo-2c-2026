import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { armarApp } from "./app.js";

async function prepararProyecto(perfil = {}) {
  const { api } = await armarApp();
  const colectivo = await api
    .post("/colectivos")
    .send({
      nombre: "Comedor Esperanza",
      descripcion: "...",
      tipoColectivo: "ONG",
      ubicacion: { tipoUbicacion: "PROVINCIA", nombre: "Cordoba" },
    })
    .expect(201);
  const proyecto = await api
    .post(`/colectivos/${colectivo.body.id}/proyectos`)
    .send({
      titulo: "Sitio",
      descripcion: "...",
      perfiles: [{ ...datosDePerfil(), ...perfil }],
    })
    .expect(201);
  return { api, colectivoId: colectivo.body.id, proyecto: proyecto.body };
}

describe("HTTP · datos para el front", () => {
  test("el detalle y los listados de proyectos informan el colectivo", async () => {
    const { api, colectivoId, proyecto } = await prepararProyecto();

    const detalle = await api.get(`/proyectos/${proyecto.id}`).expect(200);
    expect(detalle.body.colectivo).toMatchObject({
      id: colectivoId,
      nombre: "Comedor Esperanza",
    });

    const listado = await api.get("/proyectos").expect(200);
    expect(listado.body.data[0].colectivo).toMatchObject({ id: colectivoId });

    const delColectivo = await api.get(`/colectivos/${colectivoId}`).expect(200);
    expect(delColectivo.body.proyectos[0]).not.toHaveProperty("colectivo");
  });

  test("el perfil guarda un titulo corto, opcional, y se puede editar", async () => {
    const { api, proyecto } = await prepararProyecto({ titulo: "Backend Node" });
    const ruta = `/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}`;

    expect(proyecto.perfiles[0].titulo).toBe("Backend Node");
    const cambiado = await api.put(ruta).send({ titulo: "Frontend React" }).expect(200);
    expect(cambiado.body.titulo).toBe("Frontend React");
    await api
      .put(ruta)
      .send({ titulo: "x".repeat(81) })
      .expect(400);
    await api.put(ruta).send({ titulo: "   " }).expect(400);
  });

  test("un perfil sin titulo lo informa como null", async () => {
    const { proyecto } = await prepararProyecto();
    expect(proyecto.perfiles[0].titulo).toBeNull();
  });

  test("estadoBusqueda sale de la busqueda y del limite de colaboraciones", async () => {
    const { api, proyecto } = await prepararProyecto({
      modoAceptacion: "HASTA_LLENAR_VACANTES",
      limiteColaboraciones: 1,
    });
    const perfilId = proyecto.perfiles[0].id;
    expect(proyecto.perfiles[0].estadoBusqueda).toBe("ABIERTA");

    const colaborador = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .send({ colaboradorId: colaborador.body.id, perfilId })
      .expect(201);

    const lleno = await api.get(`/proyectos/${proyecto.id}`).expect(200);
    expect(lleno.body.perfiles[0].estadoBusqueda).toBe("LIMITE_ALCANZADO");
  });

  test("una busqueda cerrada a mano figura como CERRADA", async () => {
    const { api, proyecto } = await prepararProyecto();
    await api
      .put(`/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}`)
      .send({ busquedaAbierta: false })
      .expect(200);
    const cerrado = await api.get(`/proyectos/${proyecto.id}`).expect(200);
    expect(cerrado.body.perfiles[0].estadoBusqueda).toBe("CERRADA");
  });

  test("las colaboraciones de la persona traen un resumen del proyecto y del perfil", async () => {
    const { api, proyecto } = await prepararProyecto({ titulo: "Backend Node" });
    const colaborador = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .send({ colaboradorId: colaborador.body.id, perfilId: proyecto.perfiles[0].id })
      .expect(201);

    const { body } = await api
      .get(`/colaboradores/${colaborador.body.id}/colaboraciones`)
      .expect(200);
    expect(body[0]).toMatchObject({
      proyectoId: proyecto.id,
      proyecto: { id: proyecto.id, titulo: "Sitio", estado: "ABIERTO" },
      perfil: { id: proyecto.perfiles[0].id, titulo: "Backend Node" },
    });
  });
});
