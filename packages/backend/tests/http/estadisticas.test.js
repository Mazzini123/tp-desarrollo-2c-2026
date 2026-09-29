import { armarApp } from "./app.js";

describe("HTTP · estadisticas", () => {
  test("GET /estadisticas es publica y cacheable", async () => {
    const { api } = await armarApp();
    const respuesta = await api.get("/estadisticas").expect(200);

    expect(respuesta.headers["cache-control"]).toBe("public, max-age=60");
    expect(respuesta.body).toHaveProperty("proyectos.total", 0);
    expect(respuesta.body).toHaveProperty("generadoEn");
  });

  test("GET /colectivos/:id/estadisticas de uno que no existe da 404", async () => {
    const { api } = await armarApp();
    await api.get("/colectivos/no-existe/estadisticas").expect(404);
  });
});
