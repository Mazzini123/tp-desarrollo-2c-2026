import { CODIGOS, crearProyectoDePrueba } from "../fixtures.js";
import { armarApp } from "./app.js";

async function prepararPerfil() {
  const { api, services } = await armarApp();
  const { proyecto } = await crearProyectoDePrueba(services);
  const perfil = proyecto.perfiles[0];
  const ruta = `/proyectos/${proyecto.id}/perfiles/${perfil.id}`;
  const { body } = await api.get(`/proyectos/${proyecto.id}`).expect(200);
  return { api, ruta, versionEdicion: body.perfiles[0].versionEdicion };
}

test("valida los dos grupos y los otros campos antes de aplicar cambios al perfil", async () => {
  const { api, ruta, versionEdicion } = await prepararPerfil();
  const original = (await api.get(ruta).expect(200)).body;
  const cambios = {
    descripcion: "Nueva descripción",
    versionEdicion,
    codigosHabilidadesRequeridas: [CODIGOS.react],
    codigosHabilidadesOpcionales: [CODIGOS.node],
  };

  expect(versionEdicion).toMatch(/^[a-f0-9]{64}$/);
  await api.put(ruta).send({ versionEdicion }).expect(400);
  await api
    .put(ruta)
    .send({ ...cambios, versionEdicion: undefined })
    .expect(400);
  await api
    .put(ruta)
    .send({ ...cambios, codigosHabilidadesOpcionales: undefined })
    .expect(400);
  await api
    .put(ruta)
    .send({ ...cambios, codigosHabilidadesRequeridas: [] })
    .expect(400);
  await api
    .put(ruta)
    .send({ ...cambios, codigosHabilidadesOpcionales: [CODIGOS.react] })
    .expect(400);
  await api
    .put(ruta)
    .send({ ...cambios, codigosHabilidadesOpcionales: ["no-existe"] })
    .expect(404);
  await api
    .put(ruta)
    .send({ ...cambios, modoAceptacion: "TODO_SUMA", limiteColaboraciones: 1 })
    .expect(400);

  expect((await api.get(ruta).expect(200)).body).toEqual(original);
});

test("rechaza una versión anterior y permite intercambiar ambos grupos en una sola edición", async () => {
  const { api, ruta, versionEdicion } = await prepararPerfil();
  const anterior = await api
    .post(`${ruta}/habilidades-opcionales`)
    .send({ codigoHabilidad: CODIGOS.react })
    .expect(200);
  expect(anterior.body.versionEdicion).not.toBe(versionEdicion);

  const cambios = {
    descripcion: "Desarrollo de interfaz",
    codigosHabilidadesRequeridas: [CODIGOS.react],
    codigosHabilidadesOpcionales: [CODIGOS.node],
  };
  await api
    .put(ruta)
    .send({ ...cambios, versionEdicion })
    .expect(409);
  expect((await api.get(ruta).expect(200)).body).toEqual(anterior.body);

  const guardado = await api
    .put(ruta)
    .send({ ...cambios, versionEdicion: anterior.body.versionEdicion })
    .expect(200);
  expect(guardado.body.descripcion).toBe(cambios.descripcion);
  expect(guardado.body.habilidadesRequeridas.map(({ codigo }) => codigo)).toEqual([
    CODIGOS.react,
  ]);
  expect(guardado.body.habilidadesOpcionales.map(({ codigo }) => codigo)).toEqual([
    CODIGOS.node,
  ]);
  expect(guardado.body.versionEdicion).not.toBe(anterior.body.versionEdicion);
});
