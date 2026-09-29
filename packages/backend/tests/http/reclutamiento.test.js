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

    const bandeja = await api.get(`/colaboradores/${ada.body.id}/notificaciones`).expect(200);
    expect(bandeja.body.data).toHaveLength(1);
    expect(bandeja.body.data[0]).toMatchObject({ tipo: "INVITACION", esLeida: false });

    const leida = await api
      .post(`/colaboradores/${ada.body.id}/notificaciones/${bandeja.body.data[0].id}/lectura`)
      .expect(200);
    expect(leida.body.esLeida).toBe(true);
  });
});
