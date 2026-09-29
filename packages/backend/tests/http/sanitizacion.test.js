import { armarApp } from "./app.js";

describe("HTTP · sanitizacion del body", () => {
  test("los textos llegan limpios al service y se guardan asi", async () => {
    const { api } = await armarApp();
    const alta = await api
      .post("/colectivos")
      .send({
        nombre: "Fundacion <b>Ejemplo</b>",
        descripcion: "Ayudamos <script>document.cookie</script>al barrio",
        tipoColectivo: "FUNDACION",
      })
      .expect(201);

    const guardado = await api.get(`/colectivos/${alta.body.id}`).expect(200);
    expect(guardado.body.nombre).toBe("Fundacion Ejemplo");
    expect(guardado.body.descripcion).toBe("Ayudamos al barrio");
  });

  test("un campo que era solo HTML queda vacio y la validacion lo rechaza", async () => {
    const { api } = await armarApp();
    await api
      .post("/colectivos")
      .send({ nombre: "<script>x</script>", descripcion: "d", tipoColectivo: "FUNDACION" })
      .expect(400);
  });
});
