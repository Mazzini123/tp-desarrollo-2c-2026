import { armarApp } from "./app.js";

describe("HTTP · baja de colectivos", () => {
  test("POST /colectivos/:id/baja y el colectivo sigue consultable", async () => {
    const { api } = await armarApp();
    const colectivo = await api
      .post("/colectivos")
      .send({
        nombre: "F",
        descripcion: "d",
        tipoColectivo: "ONG",
        mediosDeContacto: [{ tipo: "EMAIL", valor: "f@mail.com" }],
      })
      .expect(201);
    expect(colectivo.body.mediosDeContacto).toEqual([{ tipo: "EMAIL", valor: "f@mail.com" }]);

    const baja = await api.post(`/colectivos/${colectivo.body.id}/baja`).expect(200);
    expect(baja.body.mediosDeContacto).toEqual([]);

    const detalle = await api.get(`/colectivos/${colectivo.body.id}`).expect(200);
    expect(detalle.body.fechaBaja).not.toBeNull();
    await api.post(`/colectivos/${colectivo.body.id}/baja`).expect(409);
  });
});
