import { armarApp } from "./app.js";

describe("HTTP · baja de colectivos", () => {
  test("POST /colectivos/:id/baja y el colectivo sigue consultable", async () => {
    const { api } = await armarApp({
      autenticador: { autenticar: async (sub) => ({ proveedor: "prueba", sub }) },
    });
    const credencial = { Authorization: "Bearer lider-prueba" };
    await api.post("/auth/registro").set(credencial).expect(201);
    await api.put("/auth/usuario").set(credencial).send({ nombre: "Lider" }).expect(200);
    const colectivo = await api
      .post("/colectivos")
      .set(credencial)
      .send({
        nombre: "F",
        descripcion: "d",
        tipoColectivo: "ONG",
        mediosDeContacto: [{ tipo: "EMAIL", valor: "f@mail.com" }],
      })
      .expect(201);
    expect(colectivo.body).not.toHaveProperty("mediosDeContacto");

    const { body: cuenta } = await api.get("/auth/me").set(credencial).expect(200);
    const encabezados = { ...credencial, "X-Context-Id": cuenta.contextoActual.id };
    const baja = await api
      .post(`/colectivos/${colectivo.body.id}/baja`)
      .set(encabezados)
      .expect(200);
    expect(baja.body).not.toHaveProperty("mediosDeContacto");

    const detalle = await api.get(`/colectivos/${colectivo.body.id}`).expect(200);
    expect(detalle.body.fechaBaja).not.toBeNull();
    await api.post(`/colectivos/${colectivo.body.id}/baja`).set(encabezados).expect(409);
  });

  test("sin autenticacion, las rutas reservadas al lider responden 401", async () => {
    const { api } = await armarApp();
    const { body: colectivo } = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" })
      .expect(201);
    const base = `/colectivos/${colectivo.id}`;
    await api.post(`${base}/baja`).expect(401);
    await api.post(`${base}/solicitudes-ingreso/${colectivo.id}/aceptacion`).expect(401);
    await api.post(`${base}/solicitudes-ingreso/${colectivo.id}/rechazo`).expect(401);
    await api.delete(`${base}/miembros/${colectivo.id}`).expect(401);
    await api.post(`${base}/lider`).expect(401);
    expect((await api.get(base).expect(200)).body.fechaBaja).toBeNull();
  });
});
