import { armarApp } from "./app.js";

describe("HTTP · medios de contacto", () => {
  let api;
  let colaboradorId;

  beforeEach(async () => {
    ({ api } = await armarApp());
    const respuesta = await api
      .post("/colaboradores")
      .send({
        cuentaGit: "ada",
        mediosDeContacto: [{ tipo: "EMAIL", valor: "Ada@Mail.com" }],
      })
      .expect(201);
    colaboradorId = respuesta.body.id;
  });

  // "No se muestran de forma publica en la plataforma, pero quedan
  // registrados internamente" — enunciado, segunda entrega.
  test("ni el alta ni el detalle ni el listado muestran los medios", async () => {
    const detalle = await api.get(`/colaboradores/${colaboradorId}`).expect(200);
    const listado = await api.get("/colaboradores").expect(200);

    expect(detalle.body).not.toHaveProperty("mediosDeContacto");
    expect(listado.body.data[0]).not.toHaveProperty("mediosDeContacto");
  });

  test("se agrega un telefono normalizado y el repetido da 409", async () => {
    const alta = await api
      .post(`/colaboradores/${colaboradorId}/medios-de-contacto`)
      .send({ tipo: "WHATSAPP", valor: "+54 9 11 5555-1234" })
      .expect(201);
    expect(alta.body).toEqual({ tipo: "WHATSAPP", valor: "+5491155551234" });

    await api
      .post(`/colaboradores/${colaboradorId}/medios-de-contacto`)
      .send({ tipo: "WHATSAPP", valor: "+5491155551234" })
      .expect(409);
  });

  test("un email invalido o un tipo desconocido dan 400", async () => {
    await api
      .post(`/colaboradores/${colaboradorId}/medios-de-contacto`)
      .send({ tipo: "EMAIL", valor: "no-es-un-mail" })
      .expect(400);
    await api
      .post(`/colaboradores/${colaboradorId}/medios-de-contacto`)
      .send({ tipo: "PALOMA", valor: "x" })
      .expect(400);
  });

  test("la baja por ruta normaliza igual que el alta", async () => {
    await api
      .delete(`/colaboradores/${colaboradorId}/medios-de-contacto/EMAIL/ADA@mail.com`)
      .expect(204);
    await api
      .delete(`/colaboradores/${colaboradorId}/medios-de-contacto/EMAIL/ada@mail.com`)
      .expect(404);
  });
});
