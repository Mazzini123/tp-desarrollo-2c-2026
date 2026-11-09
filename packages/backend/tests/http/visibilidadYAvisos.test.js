import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";

const verificadorDePrueba = {
  async verificar(token) {
    if (!token.startsWith("cuenta-")) throw new UnauthorizedError("Sesion invalida");
    return { sub: token };
  },
};

const como = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });

async function escenario() {
  const { api } = await armarApp({ verificadorDeToken: verificadorDePrueba });
  const colectivo = (
    await api
      .post("/colectivos")
      .set(como("duenio"))
      .send({ nombre: "Colectivo", descripcion: "d", tipoColectivo: "ONG" })
      .expect(201)
  ).body;
  await api
    .post("/colectivos")
    .set(como("ajeno"))
    .send({ nombre: "Otro", descripcion: "d", tipoColectivo: "ONG" })
    .expect(201);
  const ada = (
    await api
      .post("/colaboradores")
      .set(como("ada"))
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
      .expect(201)
  ).body;
  const proyecto = (
    await api
      .post(`/colectivos/${colectivo.id}/proyectos`)
      .set(como("duenio"))
      .send({
        titulo: "P",
        descripcion: "d",
        perfiles: [datosDePerfil({ modoAceptacion: "REVISION_MANUAL" })],
      })
      .expect(201)
  ).body;
  return { api, colectivo, ada, proyecto };
}

describe("HTTP · visibilidad y avisos", () => {
  test("las visualizaciones no cuentan al colectivo dueño", async () => {
    const { api, proyecto } = await escenario();
    const ver = async (cuenta) =>
      (
        await api
          .get(`/proyectos/${proyecto.id}`)
          .set(cuenta ? como(cuenta) : {})
          .expect(200)
      ).body.visualizaciones;

    await ver("duenio");
    await ver("duenio");
    expect(await ver("ajeno")).toBe(1);
    expect(await ver(null)).toBe(2);
  });

  test("las estadisticas de un colectivo son solo de su dueño; las globales son publicas", async () => {
    const { api, colectivo } = await escenario();
    const ruta = `/colectivos/${colectivo.id}/estadisticas`;

    await api.get(ruta).expect(401);
    await api.get(ruta).set(como("ajeno")).expect(403);
    await api.get(ruta).set(como("ada")).expect(403);
    await api.get(ruta).set(como("duenio")).expect(200);
    await api.get("/estadisticas").expect(200);
  });

  test("la desvinculacion avisa a la persona solo si la hizo el colectivo", async () => {
    const { api, ada, proyecto } = await escenario();
    const avisos = async () =>
      (
        await api
          .get(`/colaboradores/${ada.id}/notificaciones`)
          .set(como("ada"))
          .expect(200)
      ).body.data.filter((n) => n.tipo === "DESVINCULACION");

    const postular = async () => {
      const respuesta = await api
        .post(`/proyectos/${proyecto.id}/colaboraciones`)
        .set(como("ada"))
        .send({ colaboradorId: ada.id, perfilId: proyecto.perfiles[0].id })
        .expect(201);
      const base = `/proyectos/${proyecto.id}/colaboraciones/${respuesta.body.id}`;
      await api.post(`${base}/aceptacion`).set(como("duenio")).expect(200);
      return base;
    };

    const propia = await postular();
    await api.post(`${propia}/desvinculacion`).set(como("ada")).expect(200);
    expect(await avisos()).toHaveLength(0);
  });

  test("cuando desvincula el colectivo, la persona recibe el aviso", async () => {
    const { api, ada, proyecto } = await escenario();
    const respuesta = await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .set(como("ada"))
      .send({ colaboradorId: ada.id, perfilId: proyecto.perfiles[0].id })
      .expect(201);
    const base = `/proyectos/${proyecto.id}/colaboraciones/${respuesta.body.id}`;
    await api.post(`${base}/aceptacion`).set(como("duenio")).expect(200);
    await api.post(`${base}/desvinculacion`).set(como("duenio")).expect(200);

    const lista = await api
      .get(`/colaboradores/${ada.id}/notificaciones`)
      .set(como("ada"))
      .expect(200);
    expect(lista.body.data.filter((n) => n.tipo === "DESVINCULACION")).toHaveLength(1);
  });
});
