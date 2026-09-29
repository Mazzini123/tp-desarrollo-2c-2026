import { armarApp } from "./app.js";
import { datosDePerfil, CODIGOS } from "../fixtures.js";

describe("HTTP · limite de solicitudes por IP (req. adicional 14)", () => {
  test("pasado el limite general responde 429 con el formato de error de la API", async () => {
    const { api } = await armarApp({ limites: { general: 2 } });

    await api.get("/colectivos").expect(200);
    const segunda = await api.get("/colectivos").expect(200);
    expect(segunda.headers.ratelimit).toBeDefined();

    const tercera = await api.get("/colectivos").expect(429);
    expect(tercera.body.message).toMatch(/Demasiadas solicitudes/);
  });

  test("/health no cuenta para el limite", async () => {
    const { api } = await armarApp({ limites: { general: 1 } });
    await api.get("/health").expect(200);
    await api.get("/health").expect(200);
    await api.get("/colectivos").expect(200);
  });

  test("las busquedas tienen su propio limite, mas bajo", async () => {
    const { api } = await armarApp({ limites: { general: 100, busquedas: 1 } });
    const colectivo = await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" });
    const proyecto = await api
      .post(`/colectivos/${colectivo.body.id}/proyectos`)
      .send({ titulo: "P", descripcion: "d", perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })] });
    const ruta = `/proyectos/${proyecto.body.id}/perfiles/${proyecto.body.perfiles[0].id}/colaboradoras-potenciales`;

    await api.get(ruta).expect(200);
    await api.get(ruta).expect(429);
    // El resto de la API sigue andando.
    await api.get("/colectivos").expect(200);
  });
});
