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

test("al darse de baja, la cuenta queda sin perfil y puede crear uno nuevo", async () => {
  const { api } = await armarApp({ verificadorDeToken: verificadorDePrueba });
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
  expect(yo.body).toEqual({ id: "cuenta-fundacion", rol: null, perfilId: null });

  const publico = await api.get(`/colectivos/${colectivo.body.id}`).expect(200);
  expect(publico.body.fechaBaja).toBeTruthy();

  await api
    .put(`/colectivos/${colectivo.body.id}`)
    .set(como("fundacion"))
    .send({ nombre: "Otro" })
    .expect(403);
  await api
    .post("/colaboradores")
    .set(como("fundacion"))
    .send({ cuentaGit: "ada" })
    .expect(201);
});
