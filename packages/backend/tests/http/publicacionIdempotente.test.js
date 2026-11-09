import { jest } from "@jest/globals";
import { datosDePerfil } from "../fixtures.js";
import { armarApp } from "./app.js";

const CLAVE = "534f50df-fb88-4d48-8a55-274a469228f8";
const PROYECTO = {
  titulo: "Sitio institucional",
  descripcion: "Difundir las actividades",
  perfiles: [datosDePerfil()],
};

test("recupera la publicacion con la misma clave y rechaza reutilizarla con otros datos", async () => {
  const { api, services } = await armarApp();
  const avisar = jest
    .spyOn(services.avisoAutomaticoService, "avisarPorProyectoNuevo")
    .mockResolvedValue(undefined);
  const colectivo = await api
    .post("/colectivos")
    .send({ nombre: "Fundacion", descripcion: "d", tipoColectivo: "ONG" })
    .expect(201);
  const ruta = `/colectivos/${colectivo.body.id}/proyectos`;

  const original = await api
    .post(ruta)
    .set("Idempotency-Key", CLAVE)
    .send(PROYECTO)
    .expect(201);
  const repetido = await api
    .post(ruta)
    .set("Idempotency-Key", CLAVE.toUpperCase())
    .send({
      perfiles: PROYECTO.perfiles,
      descripcion: PROYECTO.descripcion,
      titulo: PROYECTO.titulo,
    })
    .expect(201);
  await api
    .post(ruta)
    .set("Idempotency-Key", CLAVE)
    .send({ ...PROYECTO, titulo: "Otro proyecto" })
    .expect(409);

  expect(repetido.body.id).toBe(original.body.id);
  expect(original.body).not.toHaveProperty("idempotenciaPublicacion");
  expect(repetido.body).not.toHaveProperty("idempotenciaPublicacion");
  const listado = await api.get(ruta).expect(200);
  expect(listado.body).toHaveLength(1);
  expect(listado.body[0]).not.toHaveProperty("idempotenciaPublicacion");
  expect(avisar).toHaveBeenCalledTimes(1);
});

test("rechaza una clave invalida y permite usar la misma clave en colectivos distintos", async () => {
  const { api, services } = await armarApp();
  const primero = await services.colectivoService.crear({
    nombre: "Uno",
    descripcion: "d",
    tipoColectivo: "ONG",
  });
  const segundo = await services.colectivoService.crear({
    nombre: "Dos",
    descripcion: "d",
    tipoColectivo: "ONG",
  });
  const publicar = (colectivoId, clave) =>
    api
      .post(`/colectivos/${colectivoId}/proyectos`)
      .set("Idempotency-Key", clave)
      .send(PROYECTO);

  await publicar(primero.id, "no-es-uuid").expect(400);
  const original = await publicar(primero.id, CLAVE).expect(201);
  const otro = await publicar(segundo.id, CLAVE).expect(201);
  expect(otro.body.id).not.toBe(original.body.id);
  expect(await services.proyectoService.listarPorColectivo(primero.id)).toHaveLength(1);
});
