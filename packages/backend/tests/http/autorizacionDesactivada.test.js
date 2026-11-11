import { armarApp } from "./app.js";

const ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

describe("HTTP · sin autenticacion habilitada", () => {
  test.each([
    ["get", `/colectivos/${ID}/miembros`],
    ["post", `/colectivos/${ID}/solicitudes-ingreso`],
    ["get", `/colectivos/${ID}/medios-de-contacto`],
    ["get", `/colaboradores/${ID}/medios-de-contacto`],
    ["get", `/proyectos/${ID}/colaboradores/${ID}/contacto`],
    ["put", "/auth/contexto-actual"],
  ])("%s %s existe y responde 401", async (verbo, ruta) => {
    const { api } = await armarApp();
    const respuesta = await api[verbo](ruta).expect(401);
    expect(respuesta.body.codigo).toBe("NO_AUTENTICADO");
  });
});
