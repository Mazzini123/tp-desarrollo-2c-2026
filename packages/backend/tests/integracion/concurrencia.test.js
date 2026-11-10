import { jest } from "@jest/globals";
import request from "supertest";
import { crearApp } from "../../src/app.js";
import { MongoProyectoRepository } from "../../src/repositories/MongoProyectoRepository.js";
import { ConcurrenciaError } from "../../src/errors/ConcurrenciaError.js";
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

test("si otro pedido guardo antes, el segundo guardado falla en vez de pisarlo", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  const repositorio = new MongoProyectoRepository();

  // Dos "pedidos" leen el mismo proyecto.
  const primero = await repositorio.buscarPorId(proyecto.id);
  const segundo = await repositorio.buscarPorId(proyecto.id);

  primero.titulo = "Cambio del primero";
  await repositorio.guardar(primero);

  segundo.titulo = "Cambio del segundo";
  // El repositorio traduce el VersionError de Mongoose a un error propio.
  await expect(repositorio.guardar(segundo)).rejects.toBeInstanceOf(ConcurrenciaError);

  const enLaBase = await repositorio.buscarPorId(proyecto.id);
  expect(enLaBase.titulo).toBe("Cambio del primero");
});

test("guardar dos veces seguidas el mismo documento funciona", async () => {
  // Despues de un save() exitoso, Mongoose actualiza el __v del documento en
  // memoria: el siguiente save() del MISMO objeto no choca consigo mismo.
  const { proyecto } = await crearProyectoDePrueba(s);
  const repositorio = new MongoProyectoRepository();
  const leido = await repositorio.buscarPorId(proyecto.id);

  leido.titulo = "Primer cambio";
  await repositorio.guardar(leido);
  leido.titulo = "Segundo cambio";
  await repositorio.guardar(leido);

  const enLaBase = await repositorio.buscarPorId(proyecto.id);
  expect(enLaBase.titulo).toBe("Segundo cambio");
});

test("dos aceptaciones simultaneas no superan el limite del perfil", async () => {
  // Las colaboraciones estan en otra coleccion, pero aceptar una sube la
  // version del proyecto: el segundo pedido choca y no acepta de mas.
  const colectivo = await crearColectivoDePrueba(s.colectivoService);
  const proyecto = await s.proyectoService.crear({
    colectivoId: colectivo.id,
    titulo: "Con cupo",
    descripcion: "d",
    perfiles: [
      datosDePerfil({ modoAceptacion: "REVISION_MANUAL", limiteColaboraciones: 1 }),
    ],
  });
  const postular = async (cuentaGit) => {
    const persona = await s.colaboradorService.crear({
      cuentaGit,
      codigosHabilidades: [CODIGOS.node],
    });
    return s.colaboracionService.registrar({
      proyectoId: proyecto.id,
      perfilId: proyecto.perfiles[0].id,
      colaboradorId: persona.id,
    });
  };
  const a = await postular("ada");
  const b = await postular("bea");
  coordinarDosGuardados(s.proyectoService.proyectoRepository);

  const resultados = await Promise.allSettled([
    s.colaboracionService.aceptar(proyecto.id, a.id),
    s.colaboracionService.aceptar(proyecto.id, b.id),
  ]);

  expect(resultados.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
  expect(resultados.find((r) => r.status === "rejected").reason).toBeInstanceOf(
    ConcurrenciaError,
  );
  const guardado = await s.proyectoService.buscarPorId(proyecto.id);
  expect(guardado.colaboraciones.filter((c) => c.estaAceptada())).toHaveLength(1);
});

test("postularse a un proyecto no choca con editar otro del mismo colectivo", async () => {
  // Antes los proyectos vivian dentro del colectivo y cualquier cambio en uno
  // invalidaba la version de todos.
  const colectivo = await crearColectivoDePrueba(s.colectivoService);
  const crear = (titulo) =>
    s.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo,
      descripcion: "d",
      perfiles: [datosDePerfil({ modoAceptacion: "REVISION_MANUAL" })],
    });
  const uno = await crear("Uno");
  const otro = await crear("Otro");
  const persona = await s.colaboradorService.crear({
    cuentaGit: "ada",
    codigosHabilidades: [CODIGOS.node],
  });
  coordinarDosGuardados(s.proyectoService.proyectoRepository);

  await Promise.all([
    s.colaboracionService.registrar({
      proyectoId: uno.id,
      perfilId: uno.perfiles[0].id,
      colaboradorId: persona.id,
    }),
    s.proyectoService.actualizar(otro.id, { titulo: "Otro, editado" }),
  ]);

  expect((await s.proyectoService.buscarPorId(otro.id)).titulo).toBe("Otro, editado");
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
  const guardar = coordinarDosGuardados(s.proyectoService.proyectoRepository);
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
  const guardar = coordinarDosGuardados(s.perfilService.proyectoRepository);
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
