import { armarApp } from "./app.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";

const verificadorDePrueba = {
  async verificar(token) {
    if (!token.startsWith("cuenta-")) {
      throw new UnauthorizedError();
    }
    return { sub: token };
  },
};
const como = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });

test("al darse de baja, la cuenta queda sin contexto valido y puede pasar a colaboradora", async () => {
  const { api } = await armarApp({
    verificadorDeToken: verificadorDePrueba,
    compatContextoImplicito: true,
  });
  await api.post("/auth/registro").set(como("fundacion")).expect(201);
  await api
    .put("/auth/usuario")
    .set(como("fundacion"))
    .send({ nombre: "Fundacion" })
    .expect(200);
  const colectivo = await api
    .post("/colectivos")
    .set(como("fundacion"))
    .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" })
    .expect(201);

  await api
    .post(`/colectivos/${colectivo.body.id}/baja`)
    .set(como("fundacion"))
    .expect(200);

  const yo = await api.get("/auth/me").set(como("fundacion")).expect(200);
  expect(yo.body).toMatchObject({
    id: "cuenta-fundacion",
    rol: null,
    perfilId: null,
    contextoActual: null,
    contextos: [],
  });

  const publico = await api.get(`/colectivos/${colectivo.body.id}`).expect(200);
  expect(publico.body.fechaBaja).toBeTruthy();

  // Ya no le queda ningun contexto valido: sin X-Context-Id no hay a cual
  // operar, y con el del colectivo dado de baja, el contexto esta inactivo.
  await api
    .put(`/colectivos/${colectivo.body.id}`)
    .set(como("fundacion"))
    .send({ nombre: "Otro" })
    .expect(400);
  await api
    .post("/colaboradores")
    .set(como("fundacion"))
    .send({ cuentaGit: "ada" })
    .expect(201);
});
