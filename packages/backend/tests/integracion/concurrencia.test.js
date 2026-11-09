import { jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { crearApp } from "../../src/app.js";
import { MongoColectivoRepository } from "../../src/repositories/MongoColectivoRepository.js";
import {
  CODIGOS,
  crearColectivoDePrueba,
  crearProyectoDePrueba,
  datosDePerfil,
} from "../fixtures.js";
import { armarServicesConMongo, usarBaseDeTest } from "./baseDeTest.js";

/**
 * Concurrencia optimista con el __v (versionKey).
 *
 * El colectivo se guarda entero. Sin control de version, si dos pedidos lo
 * leen a la vez y los dos lo guardan, el segundo pisa en silencio lo que
 * guardo el primero (por ejemplo, una de dos postulaciones simultaneas se
 * pierde). Con optimisticConcurrency, el segundo save() falla.
 */
usarBaseDeTest();

let s;
beforeEach(async () => {
  s = await armarServicesConMongo();
});

test("si otro pedido guardo antes, el segundo save() falla en vez de pisarlo", async () => {
  const { colectivo, proyecto } = await crearProyectoDePrueba(s);
  const repositorio = new MongoColectivoRepository();

  // Dos "pedidos" leen el mismo colectivo.
  const primero = await repositorio.buscarPorId(colectivo.id);
  const segundo = await repositorio.buscarPorId(colectivo.id);

  primero.buscarProyecto(proyecto.id).titulo = "Cambio del primero";
  await repositorio.guardar(primero);

  segundo.buscarProyecto(proyecto.id).titulo = "Cambio del segundo";
  await expect(repositorio.guardar(segundo)).rejects.toBeInstanceOf(
    mongoose.Error.VersionError,
  );

  const enLaBase = await repositorio.buscarPorId(colectivo.id);
  expect(enLaBase.buscarProyecto(proyecto.id).titulo).toBe("Cambio del primero");
});

test("guardar dos veces seguidas el mismo documento funciona", async () => {
  // Despues de un save() exitoso, Mongoose actualiza el __v del documento en
  // memoria: el siguiente save() del MISMO objeto no choca consigo mismo.
  const { colectivo, proyecto } = await crearProyectoDePrueba(s);
  const repositorio = new MongoColectivoRepository();
  const leido = await repositorio.buscarPorId(colectivo.id);

  leido.buscarProyecto(proyecto.id).titulo = "Primer cambio";
  await repositorio.guardar(leido);
  leido.buscarProyecto(proyecto.id).titulo = "Segundo cambio";
  await repositorio.guardar(leido);

  const enLaBase = await repositorio.buscarPorId(colectivo.id);
  expect(enLaBase.buscarProyecto(proyecto.id).titulo).toBe("Segundo cambio");
});

function coordinarDosGuardados(repositorio) {
  const guardar = repositorio.guardar.bind(repositorio);
  let guardados = 0;
  let liberar;
  const ambosLlegaron = new Promise((resolve) => {
    liberar = resolve;
  });
  return jest.spyOn(repositorio, "guardar").mockImplementation(async (documento) => {
    guardados += 1;
    if (guardados === 2) liberar();
    await ambosLlegaron;
    return guardar(documento);
  });
}

test("dos POST simultaneos con la misma clave guardan un proyecto y avisan una sola vez", async () => {
  const colectivo = await crearColectivoDePrueba(s.colectivoService);
  const api = request(
    crearApp(s.controllers, { limites: { general: 10000, busquedas: 10000 } }),
  );
  const avisar = jest
    .spyOn(s.avisoAutomaticoService, "avisarPorProyectoNuevo")
    .mockResolvedValue(undefined);
  const guardar = coordinarDosGuardados(s.proyectoService.colectivoRepository);
  const publicar = () =>
    api
      .post(`/colectivos/${colectivo.id}/proyectos`)
      .set("Idempotency-Key", "534f50df-fb88-4d48-8a55-274a469228f8")
      .send({ titulo: "Sitio", descripcion: "d", perfiles: [datosDePerfil()] })
      .expect(201);

  const [primero, segundo] = await Promise.all([publicar(), publicar()]);
  expect(primero.body.id).toBe(segundo.body.id);
  expect(guardar).toHaveBeenCalledTimes(2);
  expect(await s.proyectoService.listarPorColectivo(colectivo.id)).toHaveLength(1);
  expect(avisar).toHaveBeenCalledTimes(1);
});

test("dos PUT simultáneos con la misma versión solo aplican la edición ganadora", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  const perfil = proyecto.perfiles[0];
  const api = request(
    crearApp(s.controllers, { limites: { general: 10000, busquedas: 10000 } }),
  );
  const guardar = coordinarDosGuardados(s.perfilService.colectivoRepository);
  const editar = (descripcion, requerida, opcional) =>
    api.put(`/proyectos/${proyecto.id}/perfiles/${perfil.id}`).send({
      descripcion,
      versionEdicion: perfil.versionEdicion,
      codigosHabilidadesRequeridas: [requerida],
      codigosHabilidadesOpcionales: [opcional],
    });

  const resultados = await Promise.all([
    editar("Desarrollo", CODIGOS.react, CODIGOS.node),
    editar("Pruebas", CODIGOS.cypress, CODIGOS.react),
  ]);
  expect(resultados.map(({ status }) => status).sort()).toEqual([200, 409]);
  expect(guardar).toHaveBeenCalledTimes(2);
  const ganadora = resultados.find(({ status }) => status === 200).body;
  const actual = await s.perfilService.buscarPorId(proyecto.id, perfil.id);
  expect(actual.toJSON()).toMatchObject(ganadora);
  expect(actual.versionEdicion).not.toBe(perfil.versionEdicion);
});
