import { armarApp } from "./app.js";
import { datosDePerfil, CODIGOS } from "../fixtures.js";

describe("HTTP · busqueda de colaboradoras e invitacion", () => {
  test("buscar, invitar y ver la invitacion en la bandeja de la persona", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "Fundacion", descripcion: "...", tipoColectivo: "FUNDACION" })
      .expect(201);
    const proyecto = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ titulo: "Sitio", descripcion: "...", perfiles: [datosDePerfil()] })
      .expect(201);
    const perfilId = proyecto.body.perfiles[0].id;
    const ada = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
      .expect(201);

    const busqueda = await api
      .get(`/proyectos/${proyecto.body.id}/perfiles/${perfilId}/colaboradoras-potenciales`)
      .expect(200);
    expect(busqueda.body.meta.total).toBe(1);
    expect(busqueda.body.data[0].colaborador.id).toBe(ada.body.id);

    await api
      .post(`/proyectos/${proyecto.body.id}/perfiles/${perfilId}/invitaciones`)
      .send({ colaboradorId: ada.body.id })
      .expect(201);

    // En la bandeja estan la invitacion y el aviso automatico del alta
    // (req. adicional 9: al darse de alta, le avisan que hay un proyecto).
    const bandeja = await api.get(`/colaboradores/${ada.body.id}/notificaciones`).expect(200);
    expect(bandeja.body.data.map((n) => n.tipo)).toEqual(["INVITACION", "PROYECTOS_COMPATIBLES"]);
    expect(bandeja.body.data[0].esLeida).toBe(false);

    const leida = await api
      .post(`/colaboradores/${ada.body.id}/notificaciones/${bandeja.body.data[0].id}/lectura`)
      .expect(200);
    expect(leida.body.esLeida).toBe(true);
  });
});

describe("HTTP · busqueda de proyectos segun habilidades", () => {
  test("devuelve los proyectos compatibles con las habilidades de la persona", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "Fundacion", descripcion: "...", tipoColectivo: "FUNDACION" })
      .expect(201);

    const compatible = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({
        titulo: "Sitio",
        descripcion: "...",
        perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
      })
      .expect(201);

    await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({
        titulo: "App movil",
        descripcion: "...",
        perfiles: [datosDePerfil({ requeridas: [CODIGOS.react] })],
      })
      .expect(201);

    const ada = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
      .expect(201);

    const busqueda = await api
      .get(`/colaboradores/${ada.body.id}/proyectos-potenciales`)
      .expect(200);

    expect(busqueda.body.meta.total).toBe(1);
    expect(busqueda.body.data[0].id).toBe(compatible.body.id);
  });

  test("un colaborador que no existe responde 404", async () => {
    const { api } = await armarApp();
    await api.get("/colaboradores/no-existe/proyectos-potenciales").expect(404);
  });
});
