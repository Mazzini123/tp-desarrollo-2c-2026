import { armarApp } from "./app.js";

describe("HTTP · los listados no muestran perfiles dados de baja", () => {
  test("un colectivo dado de baja sale del listado pero conserva su detalle", async () => {
    const { api, services } = await armarApp();
    const crear = (nombre) =>
      api.post("/colectivos").send({ nombre, descripcion: "d", tipoColectivo: "ONG" });
    const activo = (await crear("Activo").expect(201)).body;
    const cerrado = (await crear("Cerrado").expect(201)).body;
    await services.colectivoService.darDeBaja(cerrado.id);

    const listado = await api.get("/colectivos").expect(200);

    expect(listado.body.data.map((c) => c.id)).toEqual([activo.id]);
    expect(listado.body.meta.total).toBe(1);
    const detalle = await api.get(`/colectivos/${cerrado.id}`).expect(200);
    expect(detalle.body.fechaBaja).not.toBeNull();
  });

  test("una colaboradora dada de baja sale del listado pero conserva su detalle", async () => {
    const { api, services } = await armarApp();
    const activa = (
      await api.post("/colaboradores").send({ cuentaGit: "ada" }).expect(201)
    ).body;
    const ida = (
      await api.post("/colaboradores").send({ cuentaGit: "grace" }).expect(201)
    ).body;
    await services.colaboradorService.darDeBaja(
      await services.colaboradorService.buscarPorId(ida.id),
    );

    const listado = await api.get("/colaboradores").expect(200);

    expect(listado.body.data.map((c) => c.id)).toEqual([activa.id]);
    expect(listado.body.meta.total).toBe(1);
    await api.get(`/colaboradores/${ida.id}`).expect(200);
  });
});
