import { armarApp } from "./app.js";
import { datosDePerfil } from "../fixtures.js";

describe("HTTP · redes sociales y etiquetas", () => {
  test("una URL que no es http(s) se rechaza", async () => {
    const { api } = await armarApp();
    await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", redesSociales: [{ nombre: "X", url: "javascript:alert(1)" }] })
      .expect(400);
  });

  test("GET /proyectos?etiqueta= filtra, normalizando lo que se busca", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ titulo: "Con", descripcion: "d", perfiles: [datosDePerfil()], etiquetas: ["Salud"] })
      .expect(201);
    await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ titulo: "Sin", descripcion: "d", perfiles: [datosDePerfil()] })
      .expect(201);

    const filtrado = await api.get("/proyectos?etiqueta=SALUD").expect(200);
    expect(filtrado.body.data.map((p) => p.titulo)).toEqual(["Con"]);
    expect(filtrado.body.meta.total).toBe(1);
  });
});
