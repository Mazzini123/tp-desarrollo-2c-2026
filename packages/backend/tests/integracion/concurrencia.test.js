import mongoose from "mongoose";
import { MongoColectivoRepository } from "../../src/repositories/MongoColectivoRepository.js";
import { crearProyectoDePrueba } from "../fixtures.js";
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
