import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";

const perfilManual = () => datosDePerfil({ modoAceptacion: "REVISION_MANUAL" });

describe("HTTP · vistas publicas de proyectos y colectivos", () => {
  test("el detalle publico solo muestra a quien ocupa un rol, no a quien se postulo", async () => {
    const { api } = await armarApp();
    const colectivo = (
      await api
        .post("/colectivos")
        .send({ nombre: "Fundacion", descripcion: "d", tipoColectivo: "FUNDACION" })
        .expect(201)
    ).body;
    const proyecto = (
      await api
        .post(`/colectivos/${colectivo.id}/proyectos`)
        .send({ titulo: "Sitio", descripcion: "d", perfiles: [perfilManual()] })
        .expect(201)
    ).body;
    const perfilId = proyecto.perfiles[0].id;
    const postular = async (cuentaGit) => {
      const persona = (
        await api
          .post("/colaboradores")
          .send({ cuentaGit, codigosHabilidades: [CODIGOS.node] })
          .expect(201)
      ).body;
      return (
        await api
          .post(`/proyectos/${proyecto.id}/colaboraciones`)
          .send({ colaboradorId: persona.id, perfilId })
          .expect(201)
      ).body;
    };
    const aceptada = await postular("ada");
    const rechazada = await postular("bea");

    const antes = await api.get(`/proyectos/${proyecto.id}`).expect(200);
    expect(antes.body.colaboraciones).toEqual([]);

    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones/${aceptada.id}/aceptacion`)
      .expect(200);
    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones/${rechazada.id}/rechazo`)
      .expect(200);

    const soloAceptadas = (body) => body.colaboraciones.map((c) => c.id);
    const detalle = await api.get(`/proyectos/${proyecto.id}`).expect(200);
    expect(soloAceptadas(detalle.body)).toEqual([aceptada.id]);

    const delColectivo = await api.get(`/colectivos/${colectivo.id}`).expect(200);
    expect(soloAceptadas(delColectivo.body.proyectos[0])).toEqual([aceptada.id]);

    const proyectosDelColectivo = await api
      .get(`/colectivos/${colectivo.id}/proyectos`)
      .expect(200);
    expect(soloAceptadas(proyectosDelColectivo.body[0])).toEqual([aceptada.id]);

    const listado = await api.get("/proyectos").expect(200);
    expect(soloAceptadas(listado.body.data[0])).toEqual([aceptada.id]);
  });

  test("las postulaciones recibidas solo las ve el colectivo dueño", async () => {
    const verificador = {
      async verificar(token) {
        if (!token.startsWith("cuenta-")) throw new UnauthorizedError();
        return { sub: token };
      },
    };
    const como = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });
    const { api } = await armarApp({
      verificadorDeToken: verificador,
      compatContextoImplicito: true,
    });

    const colectivo = (
      await api
        .post("/colectivos")
        .set(como("ana"))
        .send({ nombre: "Colectivo", descripcion: "d", tipoColectivo: "ONG" })
        .expect(201)
    ).body;
    const proyecto = (
      await api
        .post(`/colectivos/${colectivo.id}/proyectos`)
        .set(como("ana"))
        .send({ titulo: "P", descripcion: "d", perfiles: [perfilManual()] })
        .expect(201)
    ).body;
    await api
      .post("/colaboradores")
      .set(como("bea"))
      .send({ cuentaGit: "bea", codigosHabilidades: [CODIGOS.node] })
      .expect(201);

    const ruta = `/proyectos/${proyecto.id}/colaboraciones`;
    await api.get(ruta).expect(401);
    await api.get(ruta).set(como("bea")).expect(403);
    await api.get(ruta).set(como("ana")).expect(200);
  });
});
